'use strict';

var proxyquire = require('proxyquire');

var FormInputController = require('../../controllers/form-input-controller');
var { noCallThru } = require('../util');
var upgradeElements = require('../../base/upgrade-elements');

// Simplified version of forms rendered by deform on the server
var TEMPLATE = `
  <form class="js-form">
    <div data-ref="formBackdrop"></div>
    <div class="js-form-input">
      <input id="deformField" data-ref="formInput firstInput" value="original value">
    </div>
    <div class="js-form-input">
      <input id="deformField2" data-ref="formInput secondInput" value="original value 2">
    </div>
    <div data-ref="formActions">
      <button data-ref="testSaveBtn">Save</button>
      <button data-ref="cancelBtn">Cancel</button>
    </div>
    <div data-ref="formSubmitError">
      <div data-ref="formSubmitErrorMessage"></div>
    </div>
  </form>
`;

var UPDATED_FORM = TEMPLATE.replace('js-form', 'js-form is-updated');

describe('FormController', function () {
  var ctrl;
  var fakeSubmitForm;
  var reloadSpy;

  beforeEach(function () {
    fakeSubmitForm = sinon.stub();
    var FormController = proxyquire('../../controllers/form-controller', {
      '../util/submit-form': noCallThru(fakeSubmitForm),
    });

    var container = document.createElement('div');
    container.innerHTML = TEMPLATE;
    upgradeElements(container, {
      '.js-form': FormController,
      '.js-form-input': FormInputController,
    });

    reloadSpy = sinon.stub();

    ctrl = container.querySelector('.js-form').controllers[0];
    ctrl.on('reload', reloadSpy);
    ctrl.on('reload', function (event) {
      ctrl = event.data.newController;
    });

    // Add element to document so that it can be focused
    document.body.appendChild(ctrl.element);
  });

  afterEach(function () {
    ctrl.element.remove();
  });

  function isEditing() {
    return ctrl.element.classList.contains('is-editing');
  }

  function submitForm() {
    return ctrl.submit();
  }

  function startEditing() {
    ctrl.refs.firstInput.focus();
  }

  function isSaving() {
    return ctrl.refs.formActions.classList.contains('is-saving');
  }

  function submitError() {
    if (!ctrl.refs.formSubmitError.classList.contains('is-visible')) {
      return '<hidden>';
    }
    return ctrl.refs.formSubmitErrorMessage.textContent;
  }

  it('begins editing when a field is focused', function () {
    ctrl.refs.firstInput.focus();
    ctrl.refs.firstInput.dispatchEvent(new Event('focus'));
    assert.isTrue(isEditing());
  });

  it('reverts the form when "Cancel" is clicked', function () {
    startEditing();
    ctrl.refs.firstInput.value = 'new value';
    ctrl.refs.cancelBtn.click();
    assert.equal(ctrl.refs.firstInput.value, 'original value');
  });

  it('reverts the form when "Escape" key is pressed', function () {
    startEditing();
    var event = new Event('keydown', {bubbles: true});
    event.key = 'Escape';
    ctrl.refs.firstInput.dispatchEvent(event);
    assert.equal(ctrl.refs.firstInput.value, 'original value');
  });

  it('submits the form when "Save" is clicked', function () {
    fakeSubmitForm.returns(Promise.resolve({status: 200, form: UPDATED_FORM}));
    ctrl.refs.testSaveBtn.click();
    assert.calledWith(fakeSubmitForm, ctrl.element);

    // Ensure that test does not complete until `FormController#submit` has
    // run
    return Promise.resolve();
  });

  context('when form is successfully submitted', function () {
    it('updates form with new rendered version from server', function () {
      fakeSubmitForm.returns(Promise.resolve({status: 200, form: UPDATED_FORM}));
      return submitForm().then(function () {
        assert.isTrue(ctrl.element.classList.contains('is-updated'));
      });
    });

    it('stops editing the form', function () {
      fakeSubmitForm.returns(Promise.resolve({status: 200, form: UPDATED_FORM}));
      return submitForm().then(function () {
        assert.isFalse(isEditing());
      });
    });
  });

  context('when validation fails', function () {
    it('updates form with rendered version from server', function () {
      startEditing();
      fakeSubmitForm.returns(Promise.reject({status: 400, form: UPDATED_FORM}));
      return submitForm().then(function () {
        assert.isTrue(ctrl.element.classList.contains('is-updated'));
      });
    });

    it('marks updated form as dirty', function () {
      startEditing();
      fakeSubmitForm.returns(Promise.reject({status: 400, form: UPDATED_FORM}));
      return submitForm().then(function () {
        assert.isTrue(ctrl.state.dirty);
      });
    });

    it('continues editing current field', function () {
      startEditing();
      fakeSubmitForm.returns(Promise.reject({status: 400, form: UPDATED_FORM}));
      return submitForm().then(function () {
        assert.isTrue(isEditing());
      });
    });
  });

  it('enters the "saving" state while the form is being submitted', function () {
    fakeSubmitForm.returns(Promise.resolve({status: 200, form: UPDATED_FORM}));
    var saved = submitForm();
    assert.isTrue(isSaving());
    return saved.then(function () {
      assert.isFalse(isSaving());
    });
  });

  it('displays an error if form submission fails without returning a new form', function () {
    fakeSubmitForm.returns(Promise.reject({status: 500, reason: 'Internal Server Error'}));
    return submitForm().then(function () {
      assert.equal(submitError(), 'Internal Server Error');
    });
  });

  it('ignores clicks outside the field being edited', function () {
    startEditing();
    var event = new Event('mousedown', {cancelable: true});
    ctrl.refs.formBackdrop.dispatchEvent(event);
    assert.isTrue(event.defaultPrevented);
  });

  it('sets form state to dirty if user modifies active field', function () {
    startEditing();

    ctrl.refs.firstInput.dispatchEvent(new Event('input'));

    assert.isTrue(ctrl.state.dirty);
  });

  context('when focus moves to another input while editing', function () {
    it('clears editing state of first input', function () {
      startEditing();
      var childInputs = ctrl.childControllers(FormInputController);

      // Focus second input. Although the user cannot focus the second input with
      // the mouse while the first is focused, they can navigate to it with the
      // tab key
      ctrl.refs.secondInput.focus();

      assert.isFalse(childInputs[0].state.editing);
      assert.isTrue(childInputs[1].state.editing);
    });

    it('keeps focus in previous input if it has unsaved changes', function () {
      startEditing();
      ctrl.setState({dirty: true});

      // Simulate user/browser attempting to switch to another field
      ctrl.refs.secondInput.focus();

      assert.equal(document.activeElement, ctrl.refs.firstInput);
    });
  });

  context('when focus moves outside of form', function () {
    it('clears editing state if field does not have unsaved changes', function (done) {
      startEditing();

      // Simulate user moving focus outside of form (eg. via tab key).
      // This may be to either another part of the page or browser chrome
      ctrl.refs.firstInput.blur();

      setTimeout(function () {
        assert.isFalse(isEditing());
        done();
      });
    });

    it('keeps current field focused if it has unsaved changes', function (done) {
      startEditing();
      ctrl.setState({dirty: true});

      // Simulate user/browser attempting to switch focus to an element outside
      // the form
      ctrl.refs.firstInput.blur();

      setTimeout(function () {
        assert.equal(document.activeElement, ctrl.refs.firstInput);
        done();
      });
    });
  });
});
