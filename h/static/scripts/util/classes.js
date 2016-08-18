'use strict';

var hyphenate = require('../util/string').hyphenate;

/**
 * Utility for generating the `class` attribute for a component given
 * a base class name and a set of active states.
 *
 * @param {string} base - The base class name or class names
 * @param {Object} states - A map of state name to boolean. If true,
 *        an `is-$state` class is appended to the result
 * @return {string} The value of the `class` attribute
 */
function classes(base, states) {
  var classes = [base];
  Object.keys(states).forEach(function (state) {
    if (states[state]) {
      classes.push('is-' + hyphenate(state));
    }
  });
  return classes.join(' ');
}

module.exports = classes;
