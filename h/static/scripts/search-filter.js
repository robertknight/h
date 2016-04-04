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

  // Small helper function for removing quote characters
  // from the beginning- and end of a string, if the
  // quote characters are the same.
  // I.e.
  //   'foo' -> foo
  //   "bar" -> bar
  //   'foo" -> 'foo"
  //   bar"  -> bar"
  var removeQuoteCharacter = function (text) {
    var start = text.slice(0, 1);
    var end = text.slice(-1);
    if ((start === '"' || start === "'") && (start === end)) {
      text = text.slice(1, text.length - 1);
    }
    return text;
  };

  var tokens = searchtext.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g);

  // Cut the opening and closing quote characters
  tokens = tokens.map(removeQuoteCharacter);

  // Remove quotes for power search.
  // I.e. 'tag:"foo bar"' -> 'tag:foo bar'
  var term;
  var filter;
  var data;
  for (var index = 0, token; index < tokens.length; index++) {
    token = tokens[index];
    var term = splitTerm(token);
    var filter = term[0];
    var data = term[1];
    if (filter) {
      tokens[index] = filter + ':' + (removeQuoteCharacter(data));
    }
  }

  return tokens;
}

// Turns string query into object, where the properties are the search terms
function toObject(searchtext) {
  var obj = {};
  var filterToBackendFilter = function (filter) {
    if (filter === 'tag') {
      return 'tags';
    } else {
      return filter;
    }
  };

  var addToObj = function (key, data) {
    if ((obj[key] != null)) {
      obj[key].push(data);
    } else {
      obj[key] = [data];
    }
  };

  if (searchtext) {
    var terms = tokenize(searchtext);
    for (var i = 0, term; i < terms.length; i++) {
      var term = splitTerm(terms[i]);
      var filter = term[0];
      var data = term[1];
      if (!filter) {
        filter = 'any';
        data = terms[i];
      }
      addToObj(filterToBackendFilter(filter), data);
    }
  }

  return obj;
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
         if (time.match(/^\d+$/)) {
           // Only digits, assuming seconds
           since.push(time);
         }
         if (time.match(/^\d+sec$/)) {
           // Time given in seconds
           var t = /^(\d+)sec$/.exec(time)[1];
           since.push(t);
         }
         if (time.match(/^\d+min$/)) {
           // Time given in minutes
           t = /^(\d+)min$/.exec(time)[1];
           since.push(t * 60);
         }
         if (time.match(/^\d+hour$/)) {
           // Time given in hours
           t = /^(\d+)hour$/.exec(time)[1];
           since.push(t * 60 * 60);
         }
         if (time.match(/^\d+day$/)) {
           // Time given in days
           t = /^(\d+)day$/.exec(time)[1];
           since.push(t * 60 * 60 * 24);
         }
         if (time.match(/^\d+week$/)) {
           // Time given in week
           t = /^(\d+)week$/.exec(time)[1];
           since.push(t * 60 * 60 * 24 * 7);
         }
         if (time.match(/^\d+month$/)) {
           // Time given in month
           t = /^(\d+)month$/.exec(time)[1];
           since.push(t * 60 * 60 * 24 * 30);
         }
         if (time.match(/^\d+year$/)) {
           // Time given in year
           t = /^(\d+)year$/.exec(time)[1];
           since.push(t * 60 * 60 * 24 * 365);
         }
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
