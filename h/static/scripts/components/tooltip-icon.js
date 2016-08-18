'use strict';

var inherits = require('inherits');
var preact = require('preact');

var Tooltip = require('./tooltip');

var Component = preact.Component;
var h = preact.h;

/**
 * An icon that displays a tooltip when hovered
 */
function TooltipIcon(props) {
  Component.call(this, props);

  var self = this;
  this.state = {active: false};
  this._onMouseEnter = function () {
    self.setState({active: true});
  };
  this._onMouseLeave = function () {
    self.setState({active: false});
  };
}
inherits(TooltipIcon, Component);

TooltipIcon.prototype.render = function () {
  return h('span', {
    ariaLabel: this.props.label,
    class: 'form-input__hint-icon',
    onMouseEnter: this._onMouseEnter,
    onMouseLeave: this._onMouseLeave,
  },
    h('span', {dangerouslySetInnerHTML: {__html: this.props.iconHtml}}),
    h(Tooltip, {active: this.state.active, label: this.props.label})
  );
};

module.exports = TooltipIcon;
