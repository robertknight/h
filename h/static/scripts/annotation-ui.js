'use strict';

function value(selection) {
  if (Object.keys(selection).length) {
    return selection;
  } else {
    return null;
  }
}

/**
 * Stores the UI state of the annotator in connected clients.
 *
 * This includes:
 * - The set of annotations that are currently selected
 * - The annotation(s) that are currently hovered/focused
 * - The state of the bucket bar
 *
 */
module.exports = function () {
  // Subscribers listening for changes to the state of
  // the model
  var listeners = [];

  function notify(model) {
    listeners.forEach(function (listener) {
      listener(model);
    });
  }

  return {
    // List of all loaded annotations
    annotations: [],

    visibleHighlights: false,

    // Contains a map of annotation tag:true pairs.
    focusedAnnotationMap: null,

    // Contains a map of annotation id:true pairs.
    selectedAnnotationMap: null,

    // Set of IDs of expanded annotations
    expanded: {},

    // Set of IDs of annotations that have been explicitly shown
    // by the user even if they do not match the current search filter
    forceVisible: {},

    /**
     * @ngdoc method
     * @name annotationUI.focusedAnnotations
     * @returns nothing
     * @description Takes an array of annotations and uses them to set
     * the focusedAnnotationMap.
     */
    focusAnnotations: function (annotations) {
      var selection = {};
      for (var i = 0, annotation; i < annotations.length; i++) {
        annotation = annotations[i];
        selection[annotation.$$tag] = true;
      }
      this.focusedAnnotationMap = value(selection);
      notify(this);
    },

    /**
     * @ngdoc method
     * @name annotationUI.hasSelectedAnnotations
     * @returns true if there are any selected annotations.
     */
    hasSelectedAnnotations: function () {
      return !!this.selectedAnnotationMap;
    },

    setCollapsed: function (id, collapsed) {
      this.expanded = Object.assign({}, this.expanded);
      this.expanded[id] = !collapsed;
      notify(this);
    },

    setForceVisible: function (id, forceVisible) {
      this.forceVisible = Object.assign({}, this.forceVisible);
      this.forceVisible[id] = forceVisible;
      notify(this);
    },

    clearForceVisible: function () {
      this.forceVisible = {};
      notify(this);
    },

    /**
     * @ngdoc method
     * @name annotationUI.isAnnotationSelected
     * @returns true if the provided annotation is selected.
     */
    isAnnotationSelected: function (id) {
      return (this.selectedAnnotationMap || {}).hasOwnProperty(id);
    },

    /**
     * @ngdoc method
     * @name annotationUI.selectAnnotations
     * @returns nothing
     * @description Takes an array of annotation objects and uses them to
     * set the selectedAnnotationMap property.
     */
    selectAnnotations: function (annotations) {
      var selection = {};
      for (var i = 0, annotation; i < annotations.length; i++) {
        annotation = annotations[i];
        selection[annotation.id] = true;
      }
      this.selectedAnnotationMap = value(selection);
      notify(this);
    },

    /**
     * @ngdoc method
     * @name annotationUI.xorSelectedAnnotations()
     * @returns nothing
     * @description takes an array of annotations and adds them to the
     * selectedAnnotationMap if not present otherwise removes them.
     */
    xorSelectedAnnotations: function (annotations) {
      var selection = Object.assign({}, this.selectedAnnotationMap);
      for (var i = 0, annotation; i < annotations.length; i++) {
        annotation = annotations[i];
        var id = annotation.id;
        if (selection[id]) {
          delete selection[id];
        } else {
          selection[id] = true;
        }
      }
      this.selectedAnnotationMap = value(selection);
      notify(this);
    },

    /**
     * @ngdoc method
     * @name annotationUI.removeSelectedAnnotation()
     * @returns nothing
     * @description removes an annotation from the current selection.
     */
    removeSelectedAnnotation: function (annotation) {
      var selection = Object.assign({}, this.selectedAnnotationMap);
      if (selection) {
        delete selection[annotation.id];
        this.selectedAnnotationMap = value(selection);
      }
      notify(this);
    },

    /**
     * @ngdoc method
     * @name annotationUI.clearSelectedAnnotations()
     * @returns nothing
     * @description removes all annotations from the current selection.
     */
    clearSelectedAnnotations: function () {
      this.selectedAnnotationMap = null;
      notify(this);
    },

    addAnnotations: function (annotations) {
      this.annotations = this.annotations.concat(annotations);
      notify(this);
    },

    /**
     * Remove an annotaton from the currently displayed set.
     */
    removeAnnotation: function (annotation) {
      this.annotations = this.annotations.filter(function (annot) {
        return annot !== annotation &&
               annot.id !== annotation.id &&
               annot.$$tag !== annotation.$$tag;
      });
      notify(this);
    },

    clearAnnotations: function () {
      this.annotations = [];
      notify(this);
    },

    subscribe: function (listener) {
      listeners.push(listener);
    },
  };
};
