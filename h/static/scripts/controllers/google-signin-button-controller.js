'use strict';

/* global gapi */

const Controller = require('../base/controller');

class GoogleSignInButtonController extends Controller {
  constructor(element, options) {
    super(element, options);

    // Track whether the user explicitly clicked the Google Sign In button or
    // not.
    let btnClicked = false;
    element.addEventListener('click', () => {
      btnClicked = true;
    });

    if (!gapi) {
      console.warn('Google client library not loaded. Not rendering Sign In button.');
      return;
    }

    const onSuccess = (user) => {
      if (!btnClicked) {
        // Automatic authorization from a previous login. Disconnect so that the
        // user can log in again.
        const auth2 = gapi.auth2.init();
        auth2.disconnect();
        return;
      }

      const idTokenInput = this.refs.idTokenInput;
      idTokenInput.value = user.getAuthResponse().id_token;

      const signInForm = this.refs.signInForm;
      signInForm.submit();
    };

    const onFailure = (err) => {
      console.error(err);
    };

    element.id = 'google-signin-btn';
    gapi.signin2.render(element.id, {
      scope: 'profile email',
      width: 240,
      height: 50,
      longtitle: true,
      theme: 'dark',
      onSuccess,
      onFailure,
    });
  }
}

module.exports = GoogleSignInButtonController;
