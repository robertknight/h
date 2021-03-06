"""The h API search functions.

All search (Annotation.search(), Annotation.search_raw()) and Elasticsearch
stuff should be encapsulated in this module.

"""
import logging

import webob.multidict

from h.api import models

log = logging.getLogger(__name__)


def _match_clause_for_uri(uri):
    """Return an Elasticsearch match clause dict for the given URI."""
    if not uri:
        return None

    # Attempt to expand the query to include URIs for other representations of
    # the same document, using information we may have on hand about the
    # document.
    doc = models.Document.get_by_uri(uri)
    if doc:
        uri_matchers = [{"match": {"uri": u}} for u in doc.uris()]
        return {
            "bool": {
                "minimum_should_match": 1,
                "should": uri_matchers
            }
        }
    else:
        return {"match": {"uri": uri}}


def build_query(request_params):
    """Return an Elasticsearch query dict for the given h search API params.

    Translates the HTTP request params accepted by the h search API into an
    Elasticsearch query dict.

    :param request_params: the HTTP request params that were posted to the
        h search API
    :type request_params: webob.multidict.NestedMultiDict

    :returns: an Elasticsearch query dict corresponding to the given h search
        API params
    :rtype: dict

    """
    # NestedMultiDict objects are read-only, so we need to copy to make it
    # modifiable.
    request_params = request_params.copy()

    try:
        from_ = int(request_params.pop("offset"))
        if from_ < 0:
            raise ValueError
    except (ValueError, KeyError):
        from_ = 0

    try:
        size = int(request_params.pop("limit"))
        if size < 0:
            raise ValueError
    except (ValueError, KeyError):
        size = 20

    query = {
        "from": from_,
        "size": size,
        "sort": [
            {
                request_params.pop("sort", "updated"): {
                    "ignore_unmapped": True,
                    "order": request_params.pop("order", "desc")
                }
            }
        ]
    }

    matches = []
    uri_match_clause = _match_clause_for_uri(request_params.pop("uri", None))
    if uri_match_clause:
        matches.append(uri_match_clause)

    if "any" in request_params:
        matches.append({
            "multi_match": {
                "fields": ["quote", "tags", "text", "uri.parts", "user"],
                "query": request_params.getall("any"),
                "type": "cross_fields"
            }
        })
        del request_params["any"]

    for key, value in request_params.items():
        matches.append({"match": {key: value}})
    matches = matches or [{"match_all": {}}]

    query["query"] = {"bool": {"must": matches}}

    return query


def search(request_params, user=None):
    """Search with the given params and return the matching annotations.

    :param request_params: the HTTP request params that were posted to the
        h search API
    :type request_params: webob.multidict.NestedMultiDict

    :param user: the authorized user, or None
    :type user: h.accounts.models.User or None

    :returns: a dict with keys "rows" (the list of matching annotations, as
        dicts) and "total" (the number of matching annotations, an int)
    :rtype: dict

    """
    log.debug("Searching with user=%s, for uri=%s",
              user.id if user else 'None',
              request_params.get('uri'))

    query = build_query(request_params)
    results = models.Annotation.search_raw(query, user=user, raw_result=True)

    total = results['hits']['total']
    docs = results['hits']['hits']
    rows = [models.Annotation(d['_source'], id=d['_id']) for d in docs]

    return {"rows": rows, "total": total}


def index(user=None):
    """Return the 20 most recent annotations, most-recent first.

    Returns the 20 most recent annotations that are visible to the given user,
    or that are public if user is None.

    """
    return search(webob.multidict.NestedMultiDict({"limit": 20}), user=user)
