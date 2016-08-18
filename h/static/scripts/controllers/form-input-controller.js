'use strict';

var Controller = require('../base/controller');
var { setElementState } = require('../util/dom');

/**
 * Controller for form input fields.
 */
class FormInputController extends Controller {
  constructor(element, options) {
    super(element, options);

    this.refs.formInput.addEventListener('focus', () => {
      this.trigger('form-input:focus');
    });
    this.refs.formInput.addEventListener('input', () => {
      this.trigger('form-input:input');
    });
  }

  update(state) {
    setElementState(this.element, {editing: state.editing});
  }

  focus() {
    this.refs.formInput.focus();
  }
}

module.exports = FormInputController;
