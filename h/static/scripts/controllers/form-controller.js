'use strict';

var Controller = require('../base/controller');
var { setElementState } = require('../util/dom');
var submitForm = require('../util/submit-form');

/**
 * A controller which adds inline editing functionality to forms
 */
class FormController extends Controller {
  constructor(element, options) {
    super(element, options);

    setElementState(this.refs.cancelBtn, {hidden: false});
    this.refs.cancelBtn.addEventListener('click', event => {
      event.preventDefault();
      this.cancel();
    });

    this.on('form-input:focus', event => {
      var input = event.controller;

      // Enforce that the current field retains focus while it has unsaved
      // changes
      if (this.state.dirty &&
          this.state.editingField &&
          this.state.editingField !== input) {
        this.state.editingField.focus();
        return;
      }

      this.setState({
        editingField: input,
      });
    });

    this.on('form-input:input', () => {
      this.setState({dirty: true});
    });

    this.on('keydown', event => {
      event.stopPropagation();
      if (event.key === 'Escape') {
        this.cancel();
      }
    });

    // Ignore clicks outside of the active field when editing
    this.refs.formBackdrop.addEventListener('mousedown', event => {
      event.preventDefault();
      event.stopPropagation();
    });

    // When the user tabs outside of the form, cancel editing
    this.element.addEventListener('blur', () => {
      // Add a timeout because `document.activeElement` is not updated until
      // after the event is processed
      setTimeout(() => {
        // If the user has made changes to the active element, then keep focus
        // on the active field, otherwise allow them to move to the previous /
        // next fields by tabbing
        if (this.state.dirty && !this._isEditingFieldFocused()) {
          this.state.editingField.focus();
        } else if (!this.element.contains(document.activeElement)) {
          this.setState({editingField: null});
        }
      }, 0);
    }, true /* capture - 'blur' does not bubble */);

    // Setup AJAX handling for forms
    this.on('submit', event => {
      event.preventDefault();
      this.submit();
    });

    this.setState({
      // True if the user has made changes to the field they are currently
      // editing
      dirty: false,
      // The controller for the field currently being edited
      editingField: null,
      // Markup for the original form. Used to revert the form to its original
      // state when the user cancels editing
      originalForm: this.element.outerHTML,
      // Flag that indicates a save is currently in progress
      saving: false,
      // Error that occurred while submitting the form
      submitError: '',
    });
  }

  update(state, prevState) {
    if (prevState.editingField &&
        state.editingField !== prevState.editingField) {
      prevState.editingField.setState({editing: false});
    }

    if (state.editingField) {
      // Display Save/Cancel buttons below the field that we are currently
      // editing
      state.editingField.element.parentElement.insertBefore(
        this.refs.formActions,
        state.editingField.element.nextSibling
      );
      state.editingField.setState({editing: true});
    }

    var isEditing = !!state.editingField;
    setElementState(this.element, {editing: isEditing});
    setElementState(this.refs.formActions, {
      hidden: !isEditing,
      saving: state.saving,
    });
    setElementState(this.refs.formSubmitError, {
      visible: state.submitError.length > 0,
    });
    this.refs.formSubmitErrorMessage.textContent = state.submitError;
  }

  /**
   * Perform an AJAX submission of the form and replace it with the rendered
   * result.
   */
  submit() {
    var originalForm = this.state.originalForm;

    this.setState({saving: true});

    return submitForm(this.element).then(response => {
      this.reload(response.form);
    }).catch(err => {
      if (err.form) {
        var activeFieldId = document.activeElement.id;

        // The server processed the request but rejected the submission.
        // Display the returned form which will contain any validation error
        // messages.
        var newFormCtrl = this.reload(err.form);

        // Resume editing the field where validation failed
        var newField = document.getElementById(activeFieldId);
        if (newField) {
          newField.focus();
        }

        newFormCtrl.setState({
          // Mark the field in the replaced form as dirty since it has unsaved
          // changes
          dirty: newField !== null,
          // If editing is canceled, revert back to the _original_ version of
          // the form, not the version with validation errors from the server.
          originalForm: originalForm,
        });
      } else {
        // If there was an error processing the request or the server could
        // not be reached, display a helpful error
        this.setState({
          submitError: err.reason,
          saving: false,
        });
      }
    });
  }

  /**
   * Return true if the field that the user last started editing currently has
   * focus.
   */
  _isEditingFieldFocused() {
    if (!this.state.editingField) {
      return false;
    }

    var focusedEl = document.activeElement;
    if (this.refs.formActions.contains(focusedEl)) {
      return true;
    }
    return this.state.editingField.element.contains(focusedEl);
  }

  /**
   * Cancel editing for the currently active field and revert any unsaved
   * changes.
   */
  cancel() {
    this.reload(this.state.originalForm);
  }
}

module.exports = FormController;
