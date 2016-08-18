'use strict';

var preact = require('preact');

var classes = require('../util/classes');

var h = preact.h;

/**
 * A counter which displays the number of remaining characters allowed in an
 * input field.
 */
function CharacterLimit(props) {
  return h('span', {
    class: classes('form-input__character-counter', {
      tooLong: props.length > props.maxLength,
      ready: true,
    }),
  },
    props.length + '/' + props.maxLength
  );
}

module.exports = CharacterLimit;
