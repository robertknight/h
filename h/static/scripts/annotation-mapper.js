'use strict';

// Wraps the annotation store to trigger events for the CRUD actions
// @ngInject
function annotationMapper($rootScope, store) {
  function loadAnnotations(annotations, replies) {
    annotations = annotations.concat(replies || []);

    var loaded = [];
    annotations.forEach(function (annotation) {
      loaded.push(new store.AnnotationResource(annotation));
    });

    $rootScope.$emit('annotationsLoaded', loaded);
  }

  function unloadAnnotations(annotations) {
    annotations.forEach(function (annotation) {
      $rootScope.$emit('annotationDeleted', annotation);
    });
  }

  function createAnnotation(annotation) {
    annotation = new store.AnnotationResource(annotation);
    $rootScope.$emit('beforeAnnotationCreated', annotation);
    return annotation;
  }

  function deleteAnnotation(annotation) {
    return annotation.$delete({
      id: annotation.id
    }).then(function () {
      $rootScope.$emit('annotationDeleted', annotation);
      return annotation;
    });
  }

  return {
    loadAnnotations: loadAnnotations,
    unloadAnnotations: unloadAnnotations,
    createAnnotation: createAnnotation,
    deleteAnnotation: deleteAnnotation
  };
}


module.exports = annotationMapper;
