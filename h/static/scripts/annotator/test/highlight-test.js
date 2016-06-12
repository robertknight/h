'use strict';

var TextQuoteAnchor = require('dom-anchor-text-quote');

function sendEvent(element, eventType) {
  // createEvent() used instead of Event constructor
  // for PhantomJS compatibility
  var event = document.createEvent('Event');
  event.initEvent(eventType, true /* bubbles */, true /* cancelable */);
  element.dispatchEvent(event);
}

function fromHTML(html) {
  var container = document.createElement('div');
  container.innerHTML = html;
  return container;
}

function findText(container, text) {
  var anchor = new TextQuoteAnchor(container, text);
  return anchor.toRange();
}

var Highlight = require('../highlight');

function highlightTest(html, text, highlightOpts, testFn) {
  var el = fromHTML(html);
  document.body.appendChild(el);
  var range = findText(el, text);
  var hl = new Highlight(range, highlightOpts);
  testFn(el, hl);
  el.parentNode.removeChild(el);
}

describe('highlight', function () {
  describe('Highlight', function () {
    it('wraps text in a single node', function () {
      highlightTest('This is some text', 'some', {}, function (el) {
        assert.equal(el.innerHTML, 'This is <span class="highlight">some</span> text');
      });
    });

    it('wraps text in a child node', function () {
      highlightTest('This is <i>some</i> text', 'some', {}, function (el) {
        assert.equal(el.innerHTML, 'This is <i><span class="highlight">some</span></i> text');
      });
    });

    it('wraps text across multiple nodes', function () {
      highlightTest('This <b>is</b> <i>some</i> text', 'is some', {}, function (el) {
        assert.equal(el.innerHTML,
          'This <b><span class="highlight">is</span></b> ' +
          '<i><span class="highlight">some</span></i> text');
      });
    });

    it('sets wrapper class to `className` option', function () {
      highlightTest('This is some text', 'some', {className: 'annotator-hl'}, function (el) {
        assert.equal(el.innerHTML, 'This is <span class="annotator-hl">some</span> text');
      });
    });

    it('wraps text when there are nested highlights', function () {
      var el = fromHTML('This is a sentence with multiple highlights');
      document.body.appendChild(el);

      // Note that findText() here implicitly mutates the DOM structure by
      // splitting text nodes. This mirrors what happens when anchoring nested
      // annotations
      var r1 = findText(el, 'sentence with multiple');
      var r2 = findText(el, 'sentence with');

      var hl1 = new Highlight(r1);
      var hl2 = new Highlight(r2);

      assert.equal(el.innerHTML, 'This is a <span class="highlight">' +
        '<span class="highlight">sentence with</span> multiple</span> highlights');

      hl1.remove();
      hl2.remove();
      el.parentNode.removeChild(el);
    });
  });

  describe('event handling', function () {
    it('calls onClick callback when highlight is clicked', function () {
      var onClick = sinon.stub();
      highlightTest('This is some text', 'some', {onClick: onClick}, function (el) {
        var hlElement = el.querySelector('.highlight');
        sendEvent(hlElement, 'click');
        assert.called(onClick);
      });
    });

    it('calls onMouseEnter callback when highlight is hovered', function () {
      var onMouseEnter = sinon.stub();
      highlightTest('This is some text', 'some', {onMouseEnter: onMouseEnter}, function (el) {
        var hlElement = el.querySelector('.highlight');
        sendEvent(hlElement, 'mouseenter');
        assert.called(onMouseEnter);
      });
    });

    it('calls onMouseLeave callback when highlight is hovered', function () {
      var onMouseLeave = sinon.stub();
      highlightTest('This is some text', 'some', {onMouseLeave: onMouseLeave}, function (el) {
        var hlElement = el.querySelector('.highlight');
        sendEvent(hlElement, 'mouseleave');
        assert.called(onMouseLeave);
      });
    });
  });

  describe('#remove', function () {
    it('removes highlight nodes', function () {
      highlightTest('This is some text', 'some', {}, function (el, hl) {
        hl.remove();
        assert.equal(el.innerHTML, 'This is some text');
      });
    });

    it('normalizes text nodes', function () {
      highlightTest('This is some text', 'some', {}, function (el, hl) {
        hl.remove();
        assert.equal(el.childNodes.length, 1);
      });
    });
  });

  describe('#setClass', function () {
    it('adds the class to highlight nodes when `on` is true', function () {
      highlightTest('This is some text', 'some', {}, function (el, hl) {
        hl.setClass('is-focused', true);
        assert.equal(el.innerHTML, 'This is <span class="highlight is-focused">some</span> text');
      });
    });

    it('removes the class from highlight nodes when `on` is false', function () {
      highlightTest('This is some text', 'some', {}, function (el, hl) {
        hl.setClass('is-focused', true);
        hl.setClass('is-focused', false);
        assert.equal(el.innerHTML, 'This is <span class="highlight">some</span> text');
      });
    });
  });

  describe('#node', function () {
    it('returns the main DOM element for the highlight', function () {
      highlightTest('This is some text', 'some', {}, function (el, hl) {
        assert.equal(hl.node(), el.querySelector('.highlight'));
      });
    });
  });

  describe('#isEmpty', function () {
    it('returns true if highlight has no nodes', function () {
      var range = document.createRange();
      range.setStart(document.body, 0);
      var hl = new Highlight(range);
      assert.isTrue(hl.isEmpty());
    });

    it('returns false if highlight has nodes', function () {
      highlightTest('This is some text', 'some', {}, function (el, hl) {
        assert.isFalse(hl.isEmpty());
      });
    });
  });

  describe('#getBoundingClientRect', function () {
    it('returns the bounding rect of all highlight spans', function () {
      highlightTest('This is<br>some text', 'is some', {}, function (el, hl) {
        var hlSpans = el.querySelectorAll('.highlight');
        var firstHl = hlSpans[0].getBoundingClientRect();
        var secondHl = hlSpans[1].getBoundingClientRect();
        var rect = hl.getBoundingClientRect();
        assert.deepEqual(rect, {
          left: Math.min(firstHl.left, secondHl.left),
          top: firstHl.top,
          right: Math.max(firstHl.right, secondHl.right),
          bottom: secondHl.bottom,
        });
      });
    });
  });
});
