angular = require('angular')

metrics = require('./metrics')

module.exports = class WidgetController
  this.$inject = [
    '$scope', 'annotationUI', 'crossframe', 'annotationMapper', 'groups',
    'streamer', 'streamFilter', 'store', 'threading'
  ]
  constructor:   (
     $scope,   annotationUI,   crossframe,   annotationMapper,   groups,
     streamer,   streamFilter,   store,   threading
  ) ->

    $scope.isStream = true
    $scope.threadRoot = threading.root

    @chunkSize = 200
    loaded = []
    firstLoad = true

    _loadAnnotationsFrom = (query, offset) =>
      queryCore =
        limit: @chunkSize
        offset: offset
        sort: 'created'
        order: 'asc'
        group: groups.focused().id
      q = angular.extend(queryCore, query)

      store.SearchResource.get q, (results) ->
        total = results.total
        offset += results.rows.length
        if offset < total
          _loadAnnotationsFrom query, offset

        metrics.record({
          type: metrics.eventTypes.ANNOTATION_LOAD
          })
        annotationMapper.loadAnnotations(results.rows)

    loadAnnotations = (frames) ->
      if firstLoad && frames.length > 0
        installTime = null
        for f in frames
          if f.installTime
            installTime = f.installTime
        if installTime
          metrics.record({
            type: metrics.eventTypes.EMBED_START,
            timestamp: installTime,
            })
        metrics.record({
          type: metrics.eventTypes.APP_START_COMPLETE,
          once: true,
          })
        firstLoad = false

      for f in frames
        if f.uri in loaded
          continue
        loaded.push(f.uri)
        _loadAnnotationsFrom({uri: f.uri}, 0)

      if loaded.length > 0
        streamFilter.resetFilter().addClause('/uri', 'one_of', loaded)
        streamer.send({filter: streamFilter.getFilter()})

    $scope.$watchCollection (-> crossframe.frames), loadAnnotations

    $scope.focus = (annotation) ->
      if angular.isObject annotation
        highlights = [annotation.$$tag]
      else
        highlights = []
      crossframe.call('focusAnnotations', highlights)

    $scope.scrollTo = (annotation) ->
      if angular.isObject annotation
        crossframe.call('scrollToAnnotation', annotation.$$tag)

    $scope.hasFocus = (annotation) ->
      !!($scope.focusedAnnotations ? {})[annotation?.$$tag]
