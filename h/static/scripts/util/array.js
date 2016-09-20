'use strict';

/**
 * Returns the item before `current` in `items`.
 *
 * Wraps around to the end of the list if `current` is the first item.
 */
function prevItem(items, current) {
  var idx = items.indexOf(current);
  if (idx === -1) {
    return items[0];
  } else if (idx === 0) {
    return items[items.length-1];
  } else {
    return items[idx-1];
  }
}

/**
 * Returns the item after `current` in `items`.
 *
 * Wraps around to the start of the list if `current` is the first item.
 */
function nextItem(items, current) {
  var idx = items.indexOf(current);
  if (idx === -1) {
    return items[0];
  } else if (idx === items.length - 1) {
    return items[0];
  } else {
    return items[idx+1];
  }
}

module.exports = {
  nextItem,
  prevItem,
};
