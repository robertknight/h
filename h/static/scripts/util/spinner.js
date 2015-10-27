'use strict';

var BezierEasing = require('bezier-easing');

/**
 * Renders a a Material Design-style spinner
 * animation onto a <canvas>.
 *
 * Based on http://www.getmdl.io/components/index.html#loading-section/spinner
 *
 * The Material Design Lite implementation consists of a set of nested
 * <div> elements which use a combination of CSS animations and borders
 * to achieve the effect.
 *
 * This implementation uses a <canvas> as this is simpler to follow
 * and tweak.
 */
function Spinner(element, opts) {
	opts = opts || {};
	opts.lineWidth = opts.lineWidth || 5;
	opts.strokeStyle = opts.strokeStyle || 'black';

	// the amount of time it takes for the arc to
	// expand to full length and then collapse back
	// to its smallest size.
	//
	// Duration taken from $spinner-arc-time in MDL's `_variables.scss`
	var STEP_DURATION = 1333.0;

	// the amount of time taken for the spinner to
	// rotate once
	var SPIN_DURATION = 1600.0;

	// min angle between the start and end points of the arc
	var MIN_ARC_ANGLE = 0.2;
	var MAX_ARC_ANGLE = 3/4.0 * (2 * Math.PI);

	// easing parameters taken from
	// $animation-* variables in MDL's `_variables.scss`
	var easing = new BezierEasing(0.4, 0, 0.2, 1);

	var ctx = element.getContext('2d');
	ctx.lineWidth = opts.lineWidth;
	ctx.strokeStyle = opts.strokeStyle;

	var nextFrame;
	var startTime;
	var phaseStartAngle = 0;
	var prevStep = 0;

	function renderFrame() {
		ctx.save();
		ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

		var elapsed = Date.now() - startTime;

		var cx = ctx.canvas.width / 2.0;
		var cy = ctx.canvas.height / 2.0;

		// Rotate the whole spinner
		var outerRotation = (elapsed / SPIN_DURATION) * (2 * Math.PI);
		ctx.translate(cx, cy);
		ctx.rotate(outerRotation);
		ctx.translate(-cx, -cy);

		// Draw the arc
		//
		// The animation is split into two phases, first it grows from the
		// start point to a 3/4 circle, then it shrinks towards the end point
		var step = (elapsed % STEP_DURATION) / STEP_DURATION;
		var startAngle;
		var endAngle;

		if (step < prevStep) {
			phaseStartAngle -= Math.PI / 2.0;
		}
		if (step < 0.5) {
			startAngle = phaseStartAngle - MIN_ARC_ANGLE;
			endAngle = phaseStartAngle + MAX_ARC_ANGLE * easing.get(step * 2);
		} else {
			endAngle = phaseStartAngle + MAX_ARC_ANGLE;
			startAngle = phaseStartAngle - MIN_ARC_ANGLE + easing.get((step - 0.5) * 2) * MAX_ARC_ANGLE;
		}
		prevStep = step;

		ctx.beginPath();
		ctx.arc(cx, cy, cx - ctx.lineWidth * 2, startAngle, endAngle);
		ctx.stroke();

		nextFrame = requestAnimationFrame(renderFrame);
		ctx.restore();
	}

	/** Start the spinner animation. */
	this.start = function start() {
		startTime = Date.now();
		nextFrame = requestAnimationFrame(renderFrame);
	};

	/** Stop the spinner animation. */
	this.stop = function stop() {
		clearAnimationFrame(nextFrame);
		nextFrame = undefined;
	};
}

module.exports = Spinner;
