'use strict';

/**
 * @typedef Item
 * @property {string} term
 * @property {string} [label]
 */

/**
 * Return the text for an input field after autocompleting it with the
 * given suggestion.
 *
 * @param {string} input
 * @param {Item} item
 */
function complete(input, suggestion) {
  var matchLen = 0;
  for (var i=1; i <= suggestion.length; i++) {
    if (input.slice(-i) === suggestion.slice(0,i)) {
      matchLen = i;
    }
  }
  return input + suggestion.slice(matchLen);
}

/**
 * Return the set of suggestions that can autocomplete a given input.
 *
 * @param {string} query
 * @param {[facet: string]: Item} itemsByFacet - Map of search facet to candidate
 *        suggestions.
 * @param {Item[]} facetItems - Items representing available search facets
 */
function suggestionsForQuery(query, {itemsByFacet, facetItems, currentTerms}) {
  var facetMatch = query.match(/(\w+):/);
  if (facetMatch) {
    var [match,facet] = facetMatch;
    var termQuery = query.slice(facetMatch.index + match.length);
    var items = itemsByFacet[facet] || [];
    return items.filter(it => it.term.startsWith(termQuery));
  } else if (currentTerms.length === 0 || query.length > 0) {
    return facetItems.filter(it => it.term.startsWith(query));
  } else {
    return [];
  }
}

module.exports = {
  complete,
  suggestionsForQuery,
};
