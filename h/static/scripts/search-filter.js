'use strict';

var FIELDS = ['group', 'quote', 'result', 'since', 'tag', 'text', 'uri',
              'user'];

/**
 * Splits a search term into filter and data
 * i.e.
 *  'user:johndoe' -> ['user', 'johndoe']
 *   'example:text' -> [null, 'example:text']
 *
 * @param {string} term
 * @return {[string,string]} The [filter,data] pair
 */
function splitTerm(term) {
  var filter = term.slice(0, term.indexOf(':'));
  if (!filter) {
    // The whole term is data
    return [null, term];
  }

  if (FIELDS.indexOf(filter) >= 0) {
    var data = term.slice(filter.length + 1);
    return [filter, data];
  } else {
    // The filter is not a power search filter, so the whole term is data
    return [null, term];
  }
}

/**
 * Returns a copy of `text` with quote characters at the beginning and
 * end removed.
 *
 * The quotes are only removed if they are both the same:
 *   'foo' -> foo
 *   "bar" -> bar
 *   'foo" -> 'foo"
 *   bar"  -> bar"
 */
function removeQuoteCharacter(text) {
  var start = text.slice(0, 1);
  var end = text.slice(-1);
  if ((start === '"' || start === "'") && (start === end)) {
    text = text.slice(1, text.length - 1);
  }
  return text;
}

/**
 * Remove quotes from search terms with fields.
 * I.e. 'tag:"foo bar"' -> 'tag:foo bar'
 */
function removeFieldValueQuotes(text) {
  var term = splitTerm(text);
  var filter = term[0];
  var data = term[1];

  if (filter) {
    return filter + ':' + removeQuoteCharacter(data);
  } else {
    return text;
  }
}

/**
 * Split search text into whitespace separated terms, where quoted phrases
 * are considered a single term.
 *
 * @param {string} searchtext
 * @return {Array<string>} Parsed terms
 */
function tokenize(searchtext) {
  if (!searchtext) {
    return [];
  }

  var tokens = searchtext.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g);

  return tokens
   .map(removeQuoteCharacter)
   .map(removeFieldValueQuotes);
}

/**
 * Parse a search query string and return a mapping of fields to search terms.
 *
 * The resulting dictionary can be serialized as a query string and passed to
 * the Hypothesis search API.
 */
function toObject(searchtext) {
  var filterToBackendFilter = function (filter) {
    if (filter === 'tag') {
      return 'tags';
    } else {
      return filter;
    }
  };

  return tokenize(searchtext || '').reduce(function (map, term) {
    var parsedTerm = splitTerm(term);
    var filter = filterToBackendFilter(parsedTerm[0]) || 'any';
    map[filter] = map[filter] || [];
    map[filter].push(parsedTerm[1]);
    return map;
  }, {});
}

var TIME_UNITS = {
  sec: 1,
  min: 60,
  hour: 60 * 60,
  day: 60 * 60 * 24,
  week: 60 * 60 * 24 * 7,
  month: 60 * 60 * 24 * 7,
  year: 60 * 60 * 24 * 7 * 365,
};

function timeStringToSeconds(timeStr) {
  for (var unit in TIME_UNITS) {
    if (TIME_UNITS.hasOwnProperty(unit)) {
      var match = timeStr.match('^(\\d+)' + unit + '$');
      if (match) {
        return parseFloat(match[1]) * TIME_UNITS[unit];
      }
    }
  }
  return timeStr;
}

/**
 * This function will generate the facets from the search-text input
 * It'll first tokenize it and then sorts them into facet lists
 * The output will be a dict with the following structure:
 * An object with facet_names as keys.
 * A value for a key:
 * [facet_name]:
 *  [operator]: 'and'|'or'|'min' (for the elements of the facet terms list)
 *   [lowercase]: true|false
 *   [terms]: an array for the matched terms for this facet
 * The facet selection is done by analyzing each token.
 * It generally expects a <facet_name>:<facet_term> structure for a token
 * Where the facet names are: 'quote', 'result', 'since', 'tag', 'text', 'uri', 'user
 * Anything that didn't match go to the 'any' facet
 * For the 'since' facet the the time string is scanned and is converted to seconds
 * So i.e the 'since:7min' token will be converted to 7*60 = 420 for the since facet value
 */
function generateFacetedFilter(searchtext) {
  var any = [];
  var quote = [];
  var result = [];
  var since = [];
  var tag = [];
  var text = [];
  var uri = [];
  var user = [];

  if (searchtext) {
    var terms = tokenize(searchtext);
    for (var i = 0, term; i < terms.length; i++) {
      term = terms[i];
      var filter = term.slice(0, term.indexOf(":"));

      switch (filter) {
        case 'quote':
          quote.push(term.slice(6));
          break;
        case 'result':
          result.push(term.slice(7));
          break;
        case 'since':
         // We'll turn this into seconds
         var time = term.slice(6).toLowerCase();
         since.push(timeStringToSeconds(time));
         break;
        case 'tag':
          tag.push(term.slice(4));
          break;
        case 'text':
          text.push(term.slice(5));
          break;
        case 'uri':
          uri.push(term.slice(4));
          break;
        case 'user':
          user.push(term.slice(5));
          break;
        default:
          any.push(term);
      }
    }
  }

  return {
    any: {
      terms: any,
      operator: 'and'
    },
    quote: {
      terms: quote,
      operator: 'and'
    },
    result: {
      terms: result,
      operator: 'min'
    },
    since: {
      terms: since,
      operator: 'and'
    },
    tag: {
      terms: tag,
      operator: 'and'
    },
    text: {
      terms: text,
      operator: 'and'
    },
    uri: {
      terms: uri,
      operator: 'or'
    },
    user: {
      terms: user,
      operator: 'or'
    }
  };
}

module.exports = {
  generateFacetedFilter: generateFacetedFilter,
  toObject: toObject,
};
