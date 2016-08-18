'use strict';

var inherits = require('inherits');
var preact = require('preact');

var Controller = require('../base/controller');
var Form = require('../components/form');

var submitForm = require('../util/submit-form');

var h = preact.h;

/**
 * A controller which adds inline editing functionality to forms.
 *
 * When this controller is instantiated on a server-rendered form, the form
 * is replaced with a client-rendered implementation which supports inline
 * editing of form fields.
 *
 * The <form> element must have a `data-props` attribute containing a JSON
 * serialization of the form.
 */
function FormController(element) {
  Controller.call(this, element);

  var formData = JSON.parse(element.dataset.props);

  // Get the SVG icon used by fields that display a hint icon
  var hintIcon = this.refs.hintIcon.innerHTML;

  this.setState({
    formData: formData,
    hintIcon: hintIcon,
    saving: false,
  });
}
inherits(FormController, Controller);

FormController.prototype.update = function () {
  var self = this;

  function handleSubmit() {
    var success = false;
    self.setState({saving: true});
    return submitForm(self.element).then(function (response) {
      success = true;
      self.setState({formData: response.result});
    }).catch(function (err) {
      if (err.result.reason) {
        self.setState({submitError: err.result.reason});
      } else {
        self.setState({formData: err.result});
      }
    }).then(function () {
      self.setState({saving: false});
      return success;
    });
  }

  preact.render(h(Form, {
    hintIcon: this.state.hintIcon,
    submitError: this.state.submitError,
    form: this.state.formData,
    onSubmit: handleSubmit,
    saving: this.state.saving,
  }), this.element.parentElement, this.element);
};

module.exports = FormController;
