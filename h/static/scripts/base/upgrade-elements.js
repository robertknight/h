'use strict';

/**
 * Upgrade elements on the page with additional functionality
 *
 * `upgradeElements()` provides a hook to test a page without JS enhancements.
 * If `root` lives in a document whose URL contains the query string parameter
 * `nojs=1` then `upgradeElements()` will return immediately.
 *
 * Controllers attached to upgraded elements are accessible via the `controllers`
 * property on the element.
 *
 * @param {Element} root - The root element to search for matching elements
 * @param {Object} controllers - Object mapping selectors to controller classes.
 *        For each element matching a given selector, an instance of the
 *        controller class will be constructed and passed the element in
 *        order to upgrade it.
 */
function upgradeElements(root, controllers) {
  function reload(element, html) {
    if (typeof html !== 'string') {
      throw new Error('Replacement markup must be a string');
    }
    var container = document.createElement('div');
    container.innerHTML = html;
    upgradeElements(container, controllers);

    var newElement = container.children[0];
    element.parentElement.replaceChild(newElement, element);
    return newElement;
  }

  Object.keys(controllers).forEach(function (selector) {
    var elements = Array.from(root.querySelectorAll(selector));
    elements.forEach(function (el) {
      var ControllerClass = controllers[selector];
      try {
        new ControllerClass(el, {reload: reload});
      } catch (err) {
        console.error('Failed to upgrade element %s with controller', el, ControllerClass, ':', err.toString());

        // Re-raise error so that Raven can capture and report it
        throw err;
      }
    });
  });
}

module.exports = upgradeElements;
