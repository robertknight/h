'use strict';

var preact = require('preact');

/**
 * Create or update the DOM elements for a component.
 *
 * @param {Element} element - The container element for the component
 * @param {Component} Component - The component class or function defining the structure
 *        and attributes of the component instance.
 * @param {Object} props - The attributes of the component
 */
function render(element, Component, props) {
  var { h } = preact;

  try {
    return preact.render(h(Component, props), element, element.lastChild);
  } catch (err) {
    return preact.render(
      h('div', null,
        `Error rendering ${Component.name}: ${err.message}`,
        h('pre', null, err.stack))
    , element, element.lastChild);
  }
}

module.exports = render;
