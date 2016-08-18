'use strict';

var preact = require('preact');

var h = preact.h;

/**
 * A tooltip label, displayed above its containing component
 */
function Tooltip(props) {
  var tooltipStyle = {
    visibility: props.active ? '' : 'hidden',
    bottom: 'calc(100% + 5px)',
  };
  return h('div', {class: 'tooltip', style: tooltipStyle},
    h('span', {class: 'tooltip-label'}, props.label)
  );
}

module.exports = Tooltip;
