'use strict';

var inherits = require('inherits');
var preact = require('preact');

var classes = require('../util/classes');
var FormInput = require('./form-input');

var Component = preact.Component;
var h = preact.h;

/**
 * An action button (Save, Cancel etc.) for a form
 */
function FormButton(props) {
  return h('button', {
    name: props.name,
    type: props.type,
    class: 'form-actions__btn btn ' + (props.cancel ? 'btn--cancel' : null),
    onClick: props.onClick,
    disabled: props.disabled,
  }, props.title);
}

/**
 * Container for form actions displayed below the active field.
 */
function FormActions(props) {
  var formButtons = props.buttons.map(function (btn) {
    return h(FormButton, btn);
  });
  formButtons.push(h(FormButton, {
    title: 'Cancel',
    cancel: true,
    disabled: props.saving,
    onClick: function (event) {
      event.preventDefault();
      props.onCancel();
    },
  }));

  return h('div', {
    class: 'form-actions',
  },
    null /* TODO - form message */,
    h('div', {class: 'u-stretch'}),
    h('div', {
      class: classes('form-actions__buttons', {saving: props.saving}),
    }, formButtons)
  );
}

/**
 * A form that supports inline editing of fields.
 */
function Form(props) {
  Component.call(this, props);

  this.state = {
    // The field that is currently being edited
    editingField: null,
  };
}
inherits(Form, Component);

Form.prototype.componentWillUpdate = function (nextProps, nextState) {
  // When field editing is completed or canceled, remove focus from the input
  // field
  if (this.state.editingField &&
      !nextState.editingField &&
      document.activeElement) {
    document.activeElement.blur();
  }
};

Form.prototype.render = function () {
  var self = this;

  function cancelEdit() {
    Object.assign(self.state.editingField, {
      value: self.state.initialValue,
      errors: self.state.initialErrors,
    });
    self.setState({
      editingField: null,
    });
  }

  var form = this.props.form;
  var fields = form.fields.map(function (field) {
    return h(FormInput, {
      editing: self.state.editingField === field,
      field: field,
      hintIcon: self.props.hintIcon,
      key: field.oid,
      onFocus: function () {
        self.setState({
          editingField: field,
          initialValue: field.value,
          initialErrors: field.errors,
        });
      },
      onInput: function (event) {
        field.value = event.target.value;
        self.forceUpdate();
      },
    });
  });

  // Display buttons below the field actively being edited
  var editingIndex = form.fields.indexOf(self.state.editingField);
  if (editingIndex !== -1) {
    fields.splice(editingIndex+1, 0, h(FormActions, {
      buttons: form.buttons,
      onCancel: cancelEdit,
      saving: this.props.saving,
    }));
  }

  // Backdrop that fades the content behind the form when editing a field
  var backdropStyle;
  if (this.state.editingField) {
    backdropStyle = {display: 'block'};
  }

  return h('form', {
    acceptCharset: 'utf-8',
    action: form.action,
    class: 'form',
    enctype: 'multipart/form-data',
    id: form.formid,
    method: form.method,
    onKeyDown: function (event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        cancelEdit();
      }
    },
    onSubmit: function (event) {
      event.preventDefault();
      var fieldIndex = form.fields.indexOf(self.state.editingField);
      self.props.onSubmit().then(function (success) {
        if (success) {
          self.setState({
            editingField: null,
            initialValue: null,
          });
        } else {
          self.setState({editingField: self.props.form.fields[fieldIndex]});
        }
      });
    },
  },
    this.props.submitError ? h('div', {
      class: 'form__submit-error',
    }, this.props.submitError) : null,
    h('input', {type: 'hidden', name: '__formid__', value: form.formid}),
    h('div', {class: 'form__backdrop', style: backdropStyle}),
    fields
  );
};

module.exports = Form;
