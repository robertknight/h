'use strict';

var rangeUtil = require('./range-util');

/**
 * Wrap all the non-whitespace text in `range` with wrapper DOM elements.
 *
 * @return {Array<Element>} The array of wrapper elements
 */
function wrapTextInRange(range) {
  var nodes = [];
  rangeUtil.getTextNodesInRange(range).forEach(function (textNode) {
    var doc = textNode.ownerDocument;
    var nodeRange = doc.createRange();
    nodeRange.selectNode(textNode);

    if (textNode === range.startContainer) {
      nodeRange.setStart(textNode, range.startOffset);
    }
    if (textNode === range.endContainer) {
      nodeRange.setEnd(textNode, range.endOffset);
    }

    // Ignore ranges that only contain whitespace
    if (nodeRange.toString().match(/^\s*$/)) {
      return;
    }

    var wrapper = doc.createElement('span');
    nodeRange.surroundContents(wrapper);
    nodes.push(wrapper);
  });
  return nodes;
}

/**
 * Remove a node wrapping DOM content.
 *
 * eg. 'One <span class="highlight">fine</span> day' => 'One fine day'
 */
function removeWrapper(node) {
  var frag = document.createDocumentFragment();
  while (node.childNodes.length) {
    frag.appendChild(node.childNodes.item(0));
  }
  var parent = node.parentNode;
  parent.insertBefore(frag, node);
  parent.removeChild(node);

  // After extracting the contents of the highlight and re-inserting them
  // back into the parent the text will be split across multiple nodes.
  //
  // Normalizing the parent will merge split text nodes and leave the parent
  // back in the state it was in prior to inserting the highlight.
  parent.normalize();
}

var DEFAULT_OPTS = {
  className: 'highlight',
};

/**
 * A highlight for the text within a `DOMRange`.
 *
 * `Highlight` encapsulates the logic for creating DOM elements to highlight
 * the text within a range and handle events for the highlight. Clients should
 * generally not manipulate the DOM nodes for the highlights directly.
 *
 * @param {DOMRange} range - The range to highlight
 * @param {Options} opts - Display options and event callbacks for the highlight
 */
function Highlight(range, opts) {
  var self = this;
  this._opts = Object.assign({}, DEFAULT_OPTS, opts);
  this._nodes = wrapTextInRange(range);
  this._nodes.forEach(function (node) {
    node.className = self._opts.className;

    if (opts.onClick) {
      node.addEventListener('click', opts.onClick);
    }
    if (opts.onMouseEnter) {
      node.addEventListener('mouseenter', opts.onMouseEnter);
    }
    if (opts.onMouseLeave) {
      node.addEventListener('mouseleave', opts.onMouseLeave);
    }
  });
}

/** Set the specified class on the highlight's nodes. */
Highlight.prototype.setClass = function (className, on) {
  this._nodes.forEach(function (node) {
    if (on) {
      node.classList.add(className);
    } else {
      node.classList.remove(className);
    }
  });
};

/**
 * Returns the main DOM node for the highlight.
 *
 * This is exposed to allow clients to scroll the page to a highlight.
 * It should not be manipulated directly.
 */
Highlight.prototype.node = function () {
  return this._nodes.length ? this._nodes[0] : null;
};

/** Returns true if the highlight is empty. */
Highlight.prototype.isEmpty = function () {
  return this._nodes.length === 0;
};

/** Remove the highlight from the document */
Highlight.prototype.remove = function () {
  this._nodes.forEach(removeWrapper);
};

module.exports = Highlight;
