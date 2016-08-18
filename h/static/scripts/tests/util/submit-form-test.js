'use strict';

var submitForm = require('../../util/submit-form');

/**
 * Fake `fetch()` implementation.
 *
 * This does not mock the global `window.fetch` function but provides a mock
 * via `this.fetch` which can be passed as a dependency to functions that make
 * network requests.
 */
class FakeFetch {
  constructor(routes) {
    this.calls = [];
    this.fetch = (url, init) => {
      this.calls.push({url, init});

      var match = routes.find(r =>
        r.url === url &&
        r.method === init.method
      );
      if (!match) {
        return Promise.resolve('', {status: 404});
      }

      var {body, init: responseInit} = match.response;
      return Promise.resolve(new Response(body, responseInit));
    };
  }
}

describe('submitForm', function () {
  var route = {
    url: 'http://example.org/things',
    method: 'POST',
    response: {
      body: '',
      init: {
        status: 200,
      },
    },
  };

  function createForm() {
    var form = document.createElement('form');
    form.action = route.url;
    form.method = route.method;
    form.innerHTML = '<input name="field" value="value">';
    return form;
  }

  it('submits the form data', function () {
    var fakeFetch = new FakeFetch([route]);
    var form = createForm();
    return submitForm(form, fakeFetch.fetch).then(function () {
      assert.instanceOf(fakeFetch.calls[0].init.body, FormData);
    });
  });

  it('rejects with the updated form markup if validation fails', function () {
    var form = createForm();
    var response = {
      body: 'response',
      init: {
        status: 400,
      },
    };
    var fakeFetch = new FakeFetch([Object.assign({}, route, {response})]);
    var done = submitForm(form, fakeFetch.fetch);
    return done.catch(function (err) {
      assert.match(err, sinon.match({status: 400, form: 'response'}));
    });
  });

  it('rejects with an error message if submission fails', function () {
    var form = createForm();
    var response = {
      body: '',
      init: {
        status: 500,
        statusText: 'Internal Server Error',
      },
    };
    var fakeFetch = new FakeFetch([Object.assign({}, route, {response})]);
    var done = submitForm(form, fakeFetch.fetch);
    return done.catch(function (err) {
      assert.match(err, sinon.match({status: 500, reason: 'Internal Server Error'}));
    });
  });
});
