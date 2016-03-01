'use strict';

/** Default state for new threads, before applying filters etc. */
var DEFAULT_THREAD_STATE = {
  parent: undefined,
  collapsed: true,
  visible: true,
};

/**
 * Returns a persistent identifier for an Annotation.
 * If the Annotation has been created on the server, it will have
 * an ID assigned, otherwise we fall back to the local-only '$$tag'
 * property.
 */
function id(annotation) {
  return annotation.id || annotation.$$tag;
}

/**
 * Creates a thread of annotations from a list of annotations.
 *
 * @param {Array<Annotation>} annotations - The input annotations to thread.
 * @return {Thread} - The input annotations threaded into a tree structure.
 */
function threadAnnotations(annotations) {
  // map of annotation ID -> container
  var threads = {};

  // Build mapping of annotation ID -> thread
  annotations.forEach(function (annotation) {
    threads[id(annotation)] = Object.assign({}, DEFAULT_THREAD_STATE, {
      annotation: annotation,
      children: [],
    });
  });

  // Set each thread's parent to the nearest parent which still exists
  annotations.forEach(function (annotation) {
    if (!annotation.references) {
      return;
    }

    for (var i=annotation.references.length; i >= 0; i--) {
      var parentID = annotation.references[i];
      if (!threads[parentID]) {
        // Parent does not exist, try the next one
        continue;
      }

      var grandParentID = threads[parentID].parent;
      var loop = false;
      while (grandParentID) {
        if (grandParentID === id(annotation)) {
          // Stop: We have a loop
          loop = true;
          break;
        } else {
          grandParentID = threads[grandParentID].parent;
        }
      }
      if (loop) {
        // We found a loop in the reference tree, skip this parent
        continue;
      }

      threads[id(annotation)].parent = parentID;
      threads[parentID].children.push(threads[id(annotation)]);
      break;
    }
  });

  // Collect the set of threads which have no parent as
  // children of the thread root
  var roots = [];
  Object.keys(threads).map(function (id) {
    if (!threads[id].parent) {
      roots.push(threads[id]);
    }
  });

  var root = {
    annotation: undefined,
    children: roots,
    visible: true,
    collapsed: false,
  };

  return root;
}

/**
 * Returns a copy of @p thread with the thread
 * and each of its children transformed by mapFn(thread).
 *
 * @param {Thread} thread
 * @param {(Thread) => Thread} mapFn
 */
function mapThread(thread, mapFn) {
  return Object.assign({}, mapFn(thread), {
    children: thread.children.map(function (child) {
      return mapThread(child, mapFn);
    }),
  });
}

/**
 * Return a sorted copy of an array of threads.
 *
 * @param {Array<Thread>} threads - The list of threads to sort
 * @param {(Annotation,Annotation) => boolean} compareFn
 * @return {Array<Thread>} Sorted list of threads
 */
function sort(threads, compareFn) {
  return threads.slice().sort(function (a, b) {
    if (compareFn(a.annotation, b.annotation)) {
      return -1;
    } else if (compareFn(b.annotation, a.annotation)) {
      return 1;
    } else {
      return 0;
    }
  });
}

/**
 * Return a copy of @p thread with each set of siblings sorted according
 * to @p compareFn
 */
function sortThread(thread, compareFn) {
  // TODO - It really make sense to sort the
  // child threads by the same criteria as the root thread.
  // Children should always be sorted by age.
  return Object.assign({}, thread, {
    children: sort(thread.children, compareFn),
  });
}

/**
 * Return a copy of @p thread with the replyCount property updated.
 */
function countReplies(thread) {
  var children = thread.children.map(countReplies);
  return Object.assign({}, thread, {
    children: children,
    replyCount: children.reduce(function (total, child) {
      return total + 1 + child.replyCount;
    }, 0),
  });
}

/** Return true if a thread has any visible children. */
function hasVisibleChildren(thread) {
  return thread.children.some(function (child) {
    return child.visible || hasVisibleChildren(child);
  });
}

/**
 * Default options for buildThread()
 */
var defaultOpts = {
  selected: [],
  forceVisible: undefined,
  searchFilter: undefined,
  expanded: [],
  currentSortFn: function (a, b) {
    return a.id < b.id;
  },
};

/**
 * Project, filter and sort a list of annotations into a thread structure for
 * display by the <annotation-thread> directive.
 *
 * buildThread() takes as inputs a flat list of annotations,
 * the current visibility filters and sort function and returns
 * the thread structure that should be rendered.
 */
function buildThread(annotations, opts) {
  opts = Object.assign({}, defaultOpts, opts);

  var thread = threadAnnotations(annotations);

  // Mark annotations as visible or hidden depending on whether
  // they are being edited and whether they match the current filter
  // criteria
  var showThread = function (annotation) {
    if (opts.forceVisible && opts.forceVisible.indexOf(id(annotation)) !== -1) {
      return true;
    }
    if (opts.selected.length > 0 &&
        opts.selected.indexOf(id(annotation)) === -1) {
      return false;
    }
    if (opts.searchFilter && !opts.searchFilter(annotation)) {
      return false;
    }
    return true;
  };

  // Set the visibility of threads based on whether they match
  // the current search filter
  thread = mapThread(thread, function (thread) {
    return Object.assign({}, thread, {
      visible: thread.visible &&
               thread.annotation &&
               showThread(thread.annotation),
    });
  });

  // Expand any threads which have been explicitly expanded,
  // or threads which have children matching the search filter
  thread = mapThread(thread, function (thread) {
    var hasUnfilteredChildren = opts.searchFilter && hasVisibleChildren(thread);
    return Object.assign({}, thread, {
      collapsed: !hasUnfilteredChildren &&
                 thread.annotation &&
                 opts.expanded.indexOf(id(thread.annotation)) === -1,
    });
  });

  // Remove top-level threads which contain no visible annotations
  thread.children = thread.children.filter(function (child) {
    return child.visible || hasVisibleChildren(child);
  });

  // Sort the thread according to the current search criteria
  thread = sortThread(thread, opts.currentSortFn);

  // Update reply counts
  thread = countReplies(thread);

  return thread;
}

module.exports = buildThread;
