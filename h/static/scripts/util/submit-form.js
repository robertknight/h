'use strict';

class FormSubmitError extends Error {
  constructor(message, params) {
    super(message);
    Object.assign(this, params);
  }
}

/**
 * Submit a form using the Fetch API and return the markup for the re-rendered
 * version of the form.
 *
 * @param {HTMLFormElement} formEl - The `<form>` to submit
 * @return {Promise} A promise which resolves when the form submission completes
 *         or rejects if the server rejects the submission due to a validation
 *         error or the network request fails.
 */
function submitForm(formEl, fetch = window.fetch) {
  var response;
  return fetch(formEl.action, {
    body: new FormData(formEl),
    credentials: 'same-origin',
    method: 'POST',
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
    },
  }).then(response_ => {
    response = response_;
    return response.text();
  }).then(body => {
    var { status } = response;
    switch (status) {
    case 200:
      return {status, form: body};
    case 400:
      throw new FormSubmitError('Form validation failed', {
        status, form: body,
      });
    default:
      throw new FormSubmitError('Form submission failed', {
        status,
        reason: response.statusText,
      });
    }
  });
}

module.exports = submitForm;
