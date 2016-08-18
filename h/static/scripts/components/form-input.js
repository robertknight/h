'use strict';

var preact = require('preact');

var CharacterLimit = require('./character-limit');
var TooltipIcon = require('./tooltip-icon');
var classes = require('../util/classes');

var h = preact.h;

/**
 * A plain text <input> field.
 */
function TextInput(props) {
  return h('input', props);
}

/**
 * A multi-line <textarea> input field.
 */
function TextArea(props) {
  if (props.maxLength) {
    var value = props.value || '';

    return h('span', {},
      // The `maxlength` property is not set on the input field itself so that
      // the user can type more characters but we will display an error count
      // instead.
      h('textarea', Object.assign({}, props, {maxLength: null}), value),
      h(CharacterLimit, {maxLength: props.maxLength, length: value.length})
    );
  }
  return h('textarea', props, props.value);
}

/**
 * A form input field with label, validation status and input hints
 */
function FormInput(props) {
  var field = props.field;

  if (field.type === 'hidden') {
    return h('input', {
      name: field.name,
      id: field.id,
      value: field.value,
      type: 'hidden',
    });
  }

  var fieldErrors;

  if (field.errors.length > 0) {
    fieldErrors = h('ul', {class: 'form-input__error-list'},
      field.errors.map(function (msg) {
        return h('li', {class: 'form-input__error-item'}, msg);
      })
    );
  }

  var inputProps = {
    autocomplete: field.disableAutocomplete ? 'off' : null,
    class: 'form-input__input',
    id: field.oid,
    name: field.name,
    maxLength: field.maxLength,
    onFocus: props.onFocus,
    onInput: props.onInput,
    required: !!field.required,
    value: field.value,
  };

  var inputField;
  if (field.type === 'textinput') {
    inputField = h(TextInput, inputProps);
  } else {
    inputField = h(TextArea, inputProps);
  }

  return h('div', {
    class: classes('form-input', {
      editing: props.editing,
      error: field.errors.length > 0,
    }),
    title: field.description,
    id: 'item-' + field.oid,
  },
    h('label', {
      class: 'form-input__label',
      for: field.oid,
      title: field.description,
    },
      field.title,
      field.hint ? h(TooltipIcon, {
        iconHtml: props.hintIcon,
        label: field.hint,
      }) : null
    ),
    inputField,
    fieldErrors
  );
}

module.exports = FormInput;
