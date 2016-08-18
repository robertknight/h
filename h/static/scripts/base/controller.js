'use strict';

/**
 * Search the DOM tree starting at `el` and return a map of "data-ref" attribute
 * values to elements.
 *
 * Multiple controllers may need to refer to the same element, so `data-ref`
 * supports a space-separated list of reference names.
 */
function findRefs(el) {
  var map = {};

  var descendantsWithRef = el.querySelectorAll('[data-ref]');
  for (var i=0; i < descendantsWithRef.length; i++) {
    // Use `Element#getAttribute` rather than `Element#dataset` to support IE 10
    // and avoid https://bugs.webkit.org/show_bug.cgi?id=161454
    var refEl = descendantsWithRef[i];
    var refs = (refEl.getAttribute('data-ref') || '').split(' ');
    refs.forEach(function (ref) {
      map[ref] = refEl;
    });
  }

  return map;
}

/**
 * Dispatch an event to all event handlers of an element's controller registered
 * using `Controller#on`
 */
function dispatchEvent(element, event) {
  if (!element.controllers) {
    return;
  }
  element.controllers.forEach(function (ctrl) {
    ctrl._listeners.forEach(function (listener) {
      if (listener.event === event.type) {
        listener.listener(event);
      }
    });
  });
}

/**
 * Base class for controllers that upgrade elements with additional
 * functionality.
 *
 * - Child elements with `data-ref="$name"` attributes are exposed on the
 *   controller as `this.refs.$name`.
 * - The element passed to the controller is exposed via the `element` property
 * - The controllers attached to an element are accessible via the
 *   `element.controllers` array
 *
 * The controller maintains internal state in `this.state`, which can only be
 * updated by calling (`this.setState(changes)`). Whenever the internal state of
 * the controller changes, `this.update()` is called to sync the DOM with this
 * state.
 */
class Controller {
  /**
   * Initialize the controller.
   *
   * @param {Element} element - The DOM Element to upgrade
   */
  constructor(element, options = {}) {
    if (!element.controllers) {
      element.controllers = [this];
    } else {
      element.controllers.push(this);
    }

    // Event listeners for native events and events from child controllers
    this._listeners = [];

    this.state = {};
    this.element = element;
    this.options = options;
    this.refs = findRefs(element);
  }

  /**
   * Set the state of the controller.
   *
   * This will merge `changes` into the current state and call the `update()`
   * method provided by the subclass to update the DOM to match the current state.
   */
  setState(changes) {
    var prevState = this.state;
    this.state = Object.freeze(Object.assign({}, this.state, changes));
    this.update(this.state, prevState);
  }

  /**
   * Calls update() with the current state.
   *
   * This is useful for controllers where the state is available in the DOM
   * itself, so doesn't need to be maintained internally.
   */
  forceUpdate() {
    this.update(this.state, this.state);
  }

  /**
   * Replace the HTML content of the element with an updated version from the
   * server.
   *
   * Since this replaces the entire element, the current controller will not
   * receive events for the replaced element. Instead the new controller for the
   * replaced element is returned and can be used to transfer state from the
   * existing controller.
   *
   * @param {string} html - The new markup for the element
   * @return {Controller} - The new controller instance of the same type as this
   *         controller on the element that replaces `this.element`
   */
  reload(html) {
    if (!this.options.reload) {
      throw new Error('No reload() function supplied to controller constructor');
    }

    var newElement = this.options.reload(this.element, html);
    var ctrl = (newElement.controllers || []).find(ctrl => {
      return ctrl instanceof this.constructor;
    });

    this.trigger('reload', {newController: ctrl});

    return ctrl;
  }

  /**
   * Return controllers attached to child elements which are instances of
   * `ControllerClass`
   *
   * @return {Array<ControllerClass>} Array of controllers attached to children
   *         of `this.element` which are instances of `ControllerClass`
   */
  childControllers(ControllerClass) {
    var children = this.element.querySelectorAll('*');
    var controllers = [];
    for (var i=0; i < children.length; i++) {
      var child = children[i];
      if (!child.controllers) {
        continue;
      }
      child.controllers.forEach(ctrl => {
        if (ctrl instanceof ControllerClass) {
          controllers.push(ctrl);
        }
      });
    }
    return controllers;
  }

  /**
   * Add a listener for a given DOM event emitted either on `this.element` or
   * events that bubble up from children.
   */
  on(event, listener) {
    this.element.addEventListener(event, listener);
    this._listeners.push({event, listener});
  }

  /**
   * Broadcast an event to event handlers registered on the current element and
   * parent elements using `on`.
   *
   * @param {string|Event} event - The name of an event, or the event to emit
   * @param {Object} [data] - Optional data to attach to the event as `event.data`
   */
  trigger(event, data) {
    if (typeof event === 'string') {
      event = new Event(event);
    }

    if (!(event instanceof Event)) {
      throw new Error('`event` argument must be a string or Event');
    }
    if (data) {
      event.data = data;
    }
    event.controller = this;

    // Events bubble up to parent elements like `jQuery.trigger()`
    var el = this.element;
    while (el) {
      dispatchEvent(el, event);
      el = el.parentElement;
    }
  }
}

module.exports = Controller;
