# -*- coding: utf-8 -*-

from __future__ import unicode_literals

from pyramid.httpexceptions import HTTPBadRequest, HTTPFound
from pyramid.view import view_config, view_defaults

from h.exceptions import OAuthTokenError
from h.util.view import cors_json_view
from h.util.datetime import utc_iso8601


@view_defaults(route_name='authorize',
               renderer='h:templates/accounts/authorize.html.jinja2')
class AuthorizeController(object):

    def __init__(self, request):
        self.request = request
        self.oauth_svc = self.request.find_service(name='oauth')
        self.user_svc = self.request.find_service(name='user')

    @view_config(request_method='GET')
    def get(self):
        """
        Check the user's authentication status and present the authorization
        page.
        """
        self._check_params()

        if self.request.authenticated_userid is None:
            return HTTPFound(self.request.route_url('login', _query={
                              'next': self.request.url}))

        params = self.request.params
        user = self.user_svc.fetch(self.request.authenticated_userid)

        return {'username': user.username,
                'client_name': 'Hypothesis',
                'client_id': params['client_id'],
                'response_type': params['response_type'],
                'response_mode': params['response_mode'],
                'origin': params.get('origin'),
                'redirect_uri': params.get('redirect_uri'),
                'state': params.get('state')}

    @view_config(request_method='POST',
                 renderer='h:templates/accounts/post_authorize.html.jinja2')
    def post(self):
        """
        Process an authentication request and return a grant token to the
        client.
        """
        authclient = self._check_params()

        user = self.user_svc.fetch(self.request.authenticated_userid)
        grant_token = self.oauth_svc.create_grant_token(user, authclient)

        params = self.request.params
        if params['response_mode'] == 'web_message':
            return {'grant_token': grant_token,
                    'origin': params['origin'],
                    'state': params.get('state')}
        else:
            redirect_uri = params['redirect_uri']

            # TODO - Append the grant token param to the URL.
            # Depending on the `response_mode` param this should be added as
            # either a query string parameter or a fragment.

            raise HTTPFound(location=redirect_uri)

    def _check_params(self):
        """
        Check parameters for the authorization request.

        If the parameters are valid, returns an authclient.
        Otherwise, raises an exception.
        """
        params = self.request.params

        # Validate client ID and response type
        client_id = params.get('client_id', '')
        authclient = self.oauth_svc._get_authclient_by_id(client_id)
        if not authclient:
            raise HTTPBadRequest('Unknown client ID "{}"'.format(client_id))

        # Check that response mode and location matches a pre-registered
        # location for the client.
        response_mode = params.get('response_mode', 'query')
        if response_mode in ['fragment', 'query']:
            redirect_uri = params.get('redirect_uri')
            if redirect_uri is None:
                err = '"redirect_uri" must be specified when response_mode is "query" or "fragment"'
                raise HTTPBadRequest(err)
            if redirect_uri != 'http://localhost:4000/index.html':
                err = 'Redirect URI "{}" not valid for client'.format(redirect_uri)
                raise HTTPBadRequest(err)
        elif response_mode == 'web_message':
            origin = params.get('origin')
            if origin is None:
                raise HTTPBadRequest('"origin" must be specified when response_mode is "web_message"')
            if origin != 'http://localhost:4000':
                err = 'Origin "{}" not valid for client'.format(origin)
                raise HTTPBadRequest(err)
        else:
            raise HTTPBadRequest('Unsupported response mode "{}"'.format(response_mode))

        return authclient


@cors_json_view(route_name='token', request_method='POST')
def access_token(request):
    svc = request.find_service(name='oauth')

    user, authclient = svc.verify_token_request(request.POST)
    token = svc.create_token(user, authclient)

    response = {
        'access_token': token.value,
        'token_type': 'bearer',
    }

    if token.expires:
        response['expires_in'] = token.ttl

    if token.refresh_token:
        response['refresh_token'] = token.refresh_token

    return response


@cors_json_view(route_name='api.debug_token', request_method='GET')
def debug_token(request):
    if not request.auth_token:
        raise OAuthTokenError('Bearer token is missing in Authorization HTTP header',
                              'missing_token',
                              401)

    svc = request.find_service(name='auth_token')
    token = svc.validate(request.auth_token)
    if token is None:
        raise OAuthTokenError('Bearer token does not exist or is expired',
                              'missing_token',
                              401)

    token = svc.fetch(request.auth_token)
    return _present_debug_token(token)


@cors_json_view(context=OAuthTokenError)
def api_token_error(context, request):
    """Handle an expected/deliberately thrown API exception."""
    request.response.status_code = context.status_code
    resp = {'error': context.type}
    if context.message:
        resp['error_description'] = context.message
    return resp


def _present_debug_token(token):
    data = {'userid': token.userid,
            'expires_at': utc_iso8601(token.expires) if token.expires else None,
            'issued_at': utc_iso8601(token.created),
            'expired': token.expired}

    if token.authclient:
        data['client'] = {'id': token.authclient.id,
                          'name': token.authclient.name}

    return data
