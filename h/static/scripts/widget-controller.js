'use strict';

var angular = require('angular');

var events = require('./events');

// @ngInject
module.exports = function WidgetController(
  $scope, $rootScope, annotationUI, crossframe, annotationMapper,
  drafts, groups, rootThread, streamer, streamFilter, store
) {

  $scope.sortOptions = ['Newest', 'Oldest', 'Location'];

  // Watch the inputs that determine which annotations are currently
  // visible and how they are sorted and rebuild the thread when they change
  $scope.$watch('sort.name', function (mode) {
    rootThread.sortBy(mode);
  });
  $scope.$watch('search.query', function (query) {
    rootThread.setSearchQuery(query);
  });

  $scope.rootThread = function () {
    return rootThread.thread();
  };

  $scope.toggleCollapsed = function (id) {
    annotationUI.setCollapsed(id, annotationUI.expanded[id]);
  };

  $scope.forceVisible = function (id) {
    annotationUI.setForceVisible(id, true);
  };

  var DEFAULT_CHUNK_SIZE = 200;
  var loaded = [];

  var _resetAnnotations = function () {
    // Unload all the annotations
    annotationMapper.unloadAnnotations(annotationUI.annotations);
    // Reload all the drafts
    annotationUI.addAnnotations(drafts.unsaved());
  };

  var _loadAnnotationsFrom = function (query, offset) {
    var queryCore = {
      limit: $scope.chunkSize || DEFAULT_CHUNK_SIZE,
      offset: offset,
      sort: 'created',
      order: 'asc',
      group: groups.focused().id
    };
    var q = angular.extend(queryCore, query);
    q._separate_replies = true;

    store.SearchResource.get(q, function (results) {
      var total = results.total;
      offset += results.rows.length;
      if (offset < total) {
        _loadAnnotationsFrom(query, offset);
      }

      annotationMapper.loadAnnotations(results.rows, results.replies);
    });
  };

  var loadAnnotations = function (frames) {
    for (var i = 0, f; i < frames.length; i++) {
      f = frames[i];
      var ref;
      if (ref = f.uri, loaded.indexOf(ref) >= 0) {
        continue;
      }
      loaded.push(f.uri);
      _loadAnnotationsFrom({uri: f.uri}, 0);
    }

    if (loaded.length > 0) {
      streamFilter.resetFilter().addClause('/uri', 'one_of', loaded);
      streamer.setConfig('filter', {filter: streamFilter.getFilter()});
    }
  };

  $scope.$on(events.GROUP_FOCUSED, function () {
    _resetAnnotations();
    loaded = [];
    return loadAnnotations(crossframe.frames);
  });

  $scope.$watchCollection(function () {
    return crossframe.frames;
  }, loadAnnotations);

  $scope.focus = function (annotation) {
    var highlights = [];
    if (angular.isObject(annotation)) {
      highlights = [annotation.$$tag];
    }
    return crossframe.call('focusAnnotations', highlights);
  };

  $scope.scrollTo = function (annotation) {
    if (angular.isObject(annotation)) {
      return crossframe.call('scrollToAnnotation', annotation.$$tag);
    }
  };

  $scope.hasFocus = function (annotation) {
    if (!annotation || !$scope.focusedAnnotations) {
      return false;
    }
    return annotation.$$tag in $scope.focusedAnnotations;
  };

  $rootScope.$on('beforeAnnotationCreated', function (event, data) {
    if (data.$highlight || (data.references && data.references.length > 0)) {
      return;
    }
    $scope.clearSelection();
  });
};
