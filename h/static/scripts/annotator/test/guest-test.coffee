Annotator = require('annotator')
$ = Annotator.$
Annotator['@noCallThru'] = true;

anchoring = {}

raf = sinon.stub().yields()
raf['@noCallThru'] = true

scrollIntoView = sinon.stub()
scrollIntoView['@noCallThru'] = true

proxyquire = require('proxyquire')
Guest = proxyquire('../guest', {
  './anchoring/html': anchoring,
  'annotator': Annotator,
  'raf': raf,
  'scroll-into-view': scrollIntoView,
})

# A little helper which returns a promise that resolves after a timeout
timeoutPromise = (millis = 0) ->
  new Promise((resolve) -> setTimeout(resolve, millis))

describe 'Guest', ->
  sandbox = sinon.sandbox.create()
  CrossFrame = null
  fakeCrossFrame = null

  createGuest = (options) ->
    element = document.createElement('div')
    return new Guest(element, options || {})

  beforeEach ->
    fakeCrossFrame = {
      onConnect: sinon.stub()
      on: sinon.stub()
      sync: sinon.stub()
    }

    CrossFrame = sandbox.stub()
    CrossFrame.returns(fakeCrossFrame)
    Annotator.Plugin.CrossFrame = CrossFrame

  afterEach ->
    sandbox.restore()
    delete Annotator.Plugin.CrossFrame

  describe 'cross frame', ->

    it 'provides an event bus for the annotation sync module', ->
      guest = createGuest()
      options = CrossFrame.lastCall.args[1]
      assert.isFunction(options.on)
      assert.isFunction(options.emit)

    it 'publishes the "panelReady" event when a connection is established', ->
      handler = sandbox.stub()
      guest = createGuest()
      guest.subscribe('panelReady', handler)
      fakeCrossFrame.onConnect.yield()
      assert.called(handler)

    describe 'event subscription', ->
      options = null
      guest = null

      beforeEach ->
        guest = createGuest()
        options = CrossFrame.lastCall.args[1]

      it 'proxies the event into the annotator event system', ->
        fooHandler = sandbox.stub()
        barHandler = sandbox.stub()

        options.on('foo', fooHandler)
        options.on('bar', barHandler)

        guest.publish('foo', ['1', '2'])
        guest.publish('bar', ['1', '2'])

        assert.calledWith(fooHandler, '1', '2')
        assert.calledWith(barHandler, '1', '2')

    describe 'event publication', ->
      options = null
      guest = null

      beforeEach ->
        guest = createGuest()
        options = CrossFrame.lastCall.args[1]

      it 'detaches annotations on "annotationDeleted"', ->
        ann = {id: 1, $$tag: 'tag1'}
        sandbox.stub(guest, 'detach')
        options.emit('annotationDeleted', ann)
        assert.calledOnce(guest.detach)
        assert.calledWith(guest.detach, ann)

      it 'anchors annotations on "annotationsLoaded"', ->
        ann1 = {id: 1, $$tag: 'tag1'}
        ann2 = {id: 2, $$tag: 'tag2'}
        sandbox.stub(guest, 'anchor')
        options.emit('annotationsLoaded', [ann1, ann2])
        assert.calledTwice(guest.anchor)
        assert.calledWith(guest.anchor, ann1)
        assert.calledWith(guest.anchor, ann2)

      it 'proxies all other events into the annotator event system', ->
        fooHandler = sandbox.stub()
        barHandler = sandbox.stub()

        guest.subscribe('foo', fooHandler)
        guest.subscribe('bar', barHandler)

        options.emit('foo', '1', '2')
        options.emit('bar', '1', '2')

        assert.calledWith(fooHandler, '1', '2')
        assert.calledWith(barHandler, '1', '2')

  describe 'annotation UI events', ->
    emitGuestEvent = (event, args...) ->
      fn(args...) for [evt, fn] in fakeCrossFrame.on.args when event == evt

    describe 'on "focusAnnotations" event', ->
      it 'focuses any annotations with a matching tag', ->
        highlight0 = {setClass: sinon.stub()}
        highlight1 = {setClass: sinon.stub()}
        guest = createGuest()
        guest.anchors = [
          {annotation: {$$tag: 'tag1'}, highlight: highlight0}
          {annotation: {$$tag: 'tag2'}, highlight: highlight1}
        ]
        emitGuestEvent('focusAnnotations', ['tag1'])
        assert.calledWith(highlight0.setClass, 'annotator-hl-focused', true)

      it 'unfocuses any annotations without a matching tag', ->
        highlight0 = {setClass: sinon.stub()}
        highlight1 = {setClass: sinon.stub()}
        guest = createGuest()
        guest.anchors = [
          {annotation: {$$tag: 'tag1'}, highlight: highlight0}
          {annotation: {$$tag: 'tag2'}, highlight: highlight1}
        ]
        emitGuestEvent('focusAnnotations', 'ctx', ['tag1'])
        assert.calledWith(highlight1.setClass, 'annotator-hl-focused', false)

    describe 'on "scrollToAnnotation" event', ->

      beforeEach ->
        scrollIntoView.reset()

      it 'scrolls to the anchor with the matching tag', ->
        highlightNode = $('<span></span>')
        highlight = {node: -> highlightNode[0]}
        guest = createGuest()
        guest.anchors = [
          {annotation: {$$tag: 'tag1'}, highlight: highlight}
        ]
        emitGuestEvent('scrollToAnnotation', 'tag1')
        assert.called(scrollIntoView)
        assert.calledWith(scrollIntoView, highlightNode[0])

    describe 'on "getDocumentInfo" event', ->
      guest = null

      beforeEach ->
        sandbox.stub(document, 'title', 'hi')
        guest = createGuest()
        guest.plugins.PDF =
          uri: sandbox.stub().returns(window.location.href)
          getMetadata: sandbox.stub()

      afterEach ->
        sandbox.restore()

      it 'calls the callback with the href and pdf metadata', (done) ->
        assertComplete = (err, payload) ->
          try
            assert.equal(payload.uri, document.location.href)
            assert.equal(payload.metadata, metadata)
            done()
          catch e
            done(e)

        metadata = {title: 'hi'}
        promise = Promise.resolve(metadata)
        guest.plugins.PDF.getMetadata.returns(promise)

        emitGuestEvent('getDocumentInfo', assertComplete)

      it 'calls the callback with the href and basic metadata if pdf fails', (done) ->
        assertComplete = (err, payload) ->
          try
            assert.equal(payload.uri, window.location.href)
            assert.deepEqual(payload.metadata, metadata)
            done()
          catch e
            done(e)

        metadata = {title: 'hi', link: [{href: window.location.href}]}
        promise = Promise.reject(new Error('Not a PDF document'))
        guest.plugins.PDF.getMetadata.returns(promise)

        emitGuestEvent('getDocumentInfo', assertComplete)

  describe 'onAdderMouseUp', ->
    it 'it prevents the default browser action when triggered', () ->
      event = jQuery.Event('mouseup')
      guest = createGuest()
      guest.onAdderMouseup(event)
      assert.isTrue(event.isDefaultPrevented())

    it 'it stops any further event bubbling', () ->
      event = jQuery.Event('mouseup')
      guest = createGuest()
      guest.onAdderMouseup(event)
      assert.isTrue(event.isPropagationStopped())

  describe 'createAnnotation()', ->
    it 'adds metadata to the annotation object', ->
      guest = createGuest()
      sinon.stub(guest, 'getDocumentInfo').returns(Promise.resolve({
        metadata: {title: 'hello'}
        uri: 'http://example.com/'
      }))
      annotation = {}

      guest.createAnnotation(annotation)

      timeoutPromise()
      .then ->
        assert.equal(annotation.uri, 'http://example.com/')
        assert.deepEqual(annotation.document, {title: 'hello'})

    it 'treats an argument as the annotation object', ->
      guest = createGuest()
      annotation = {foo: 'bar'}
      annotation = guest.createAnnotation(annotation)
      assert.equal(annotation.foo, 'bar')

    it 'triggers a beforeAnnotationCreated event', (done) ->
      guest = createGuest()
      guest.subscribe('beforeAnnotationCreated', -> done())

      guest.createAnnotation()

  describe 'createComment()', ->
    it 'adds metadata to the annotation object', ->
      guest = createGuest()
      sinon.stub(guest, 'getDocumentInfo').returns(Promise.resolve({
        metadata: {title: 'hello'}
        uri: 'http://example.com/'
      }))

      annotation = guest.createComment()

      timeoutPromise()
      .then ->
        assert.equal(annotation.uri, 'http://example.com/')
        assert.deepEqual(annotation.document, {title: 'hello'})

    it 'adds a single target with a source property', ->
      guest = createGuest()
      sinon.stub(guest, 'getDocumentInfo').returns(Promise.resolve({
        metadata: {title: 'hello'}
        uri: 'http://example.com/'
      }))

      annotation = guest.createComment()

      timeoutPromise()
      .then ->
        assert.deepEqual(annotation.target, [{source: 'http://example.com/'}])

    it 'triggers a beforeAnnotationCreated event', (done) ->
      guest = createGuest()
      guest.subscribe('beforeAnnotationCreated', -> done())

      guest.createComment()

  describe 'anchor()', ->
    el = null
    range = null

    beforeEach ->
      el = document.createElement('span')
      txt = document.createTextNode('hello')
      el.appendChild(txt)
      document.body.appendChild(el)
      range = document.createRange()
      range.selectNode(el)

    afterEach ->
      document.body.removeChild(el)

    it "doesn't mark an annotation lacking targets as an orphan", ->
      guest = createGuest()
      annotation = target: []

      guest.anchor(annotation).then ->
        assert.isFalse(annotation.$orphan)

    it "doesn't mark an annotation with a selectorless target as an orphan", ->
      guest = createGuest()
      annotation = {target: [{source: 'wibble'}]}

      guest.anchor(annotation).then ->
        assert.isFalse(annotation.$orphan)

    it "doesn't mark an annotation with only selectorless targets as an orphan", ->
      guest = createGuest()
      annotation = {target: [{source: 'foo'}, {source: 'bar'}]}

      guest.anchor(annotation).then ->
        assert.isFalse(annotation.$orphan)

    it "doesn't mark an annotation in which the target anchors as an orphan", ->
      guest = createGuest()
      annotation = {target: [{selector: []}]}
      sandbox.stub(anchoring, 'anchor').returns(Promise.resolve(range))

      guest.anchor(annotation).then ->
        assert.isFalse(annotation.$orphan)

    it "doesn't mark an annotation in which at least one target anchors as an orphan", ->
      guest = createGuest()
      annotation = {target: [{selector: []}, {selector: []}]}
      sandbox.stub(anchoring, 'anchor')
        .onFirstCall().returns(Promise.reject())
        .onSecondCall().returns(Promise.resolve(range))

      guest.anchor(annotation).then ->
        assert.isFalse(annotation.$orphan)

    it "marks an annotation in which the target fails to anchor as an orphan", ->
      guest = createGuest()
      annotation = target: [{selector: []}]
      sandbox.stub(anchoring, 'anchor').returns(Promise.reject())

      guest.anchor(annotation).then ->
        assert.isTrue(annotation.$orphan)

    it "marks an annotation in which all (suitable) targets fail to anchor as an orphan", ->
      guest = createGuest()
      annotation = target: [{selector: []}, {selector: []}]
      sandbox.stub(anchoring, 'anchor').returns(Promise.reject())

      guest.anchor(annotation).then ->
        assert.isTrue(annotation.$orphan)

    it 'updates the cross frame and bucket bar plugins', (done) ->
      guest = createGuest()
      guest.plugins.CrossFrame =
        sync: sinon.stub()
      guest.plugins.BucketBar =
        update: sinon.stub()
      annotation = {}
      guest.anchor(annotation).then ->
        assert.called(guest.plugins.BucketBar.update)
        assert.called(guest.plugins.CrossFrame.sync)
      .then(done, done)

    it 'returns a promise of the anchors for the annotation', (done) ->
      guest = createGuest()
      highlights = [document.createElement('span')]
      sandbox.stub(anchoring, 'anchor').returns(Promise.resolve(range))
      target = [{selector: []}]
      guest.anchor({target: [target]}).then (anchors) ->
        assert.equal(anchors.length, 1)
      .then(done, done)

    it 'adds the anchor to the "anchors" instance property"', (done) ->
      guest = createGuest()
      sandbox.stub(anchoring, 'anchor').returns(Promise.resolve(range))
      target = [{selector: []}]
      annotation = {target: [target]}
      guest.anchor(annotation).then ->
        assert.equal(guest.anchors.length, 1)
        assert.strictEqual(guest.anchors[0].annotation, annotation)
        assert.strictEqual(guest.anchors[0].target, target)
        assert.strictEqual(guest.anchors[0].range, range)
        assert.ok(guest.anchors[0].highlight)
      .then(done, done)

    it 'destroys targets that have been removed from the annotation', (done) ->
      annotation = {}
      target = {}
      highlight = { remove: sinon.stub() }
      guest = createGuest()
      guest.anchors = [{annotation, target, highlight}]

      guest.anchor(annotation).then ->
        assert.equal(guest.anchors.length, 0)
        assert.calledOnce(highlight.remove)
      .then(done, done)

    it 'does not reanchor targets that are already anchored', (done) ->
      guest = createGuest()
      annotation = target: [{selector: "test"}]
      stub = sandbox.stub(anchoring, 'anchor').returns(Promise.resolve(range))
      guest.anchor(annotation).then ->
        guest.anchor(annotation).then ->
          assert.equal(guest.anchors.length, 1)
          assert.calledOnce(stub)
      .then(done, done)

  describe 'detach()', ->
    it 'removes the anchors from the "anchors" instance variable', ->
      guest = createGuest()
      annotation = {}
      guest.anchors.push({annotation})
      guest.detach(annotation)
      assert.equal(guest.anchors.length, 0)

    it 'updates the bucket bar plugin', ->
      guest = createGuest()
      guest.plugins.BucketBar = update: sinon.stub()
      annotation = {}

      guest.anchors.push({annotation})
      guest.detach(annotation)
      assert.calledOnce(guest.plugins.BucketBar.update)

    it 'publishes the "annotationDeleted" event', ->
      guest = createGuest()
      annotation = {}
      publish = sandbox.stub(guest, 'publish')

      guest.deleteAnnotation(annotation)

      assert.calledOnce(publish)
      assert.calledWith(publish, 'annotationDeleted', [annotation])

    it 'removes any highlights associated with the annotation', ->
      guest = createGuest()
      annotation = {}
      highlight = {remove: sinon.stub()}

      guest.anchors.push({annotation, highlight})
      guest.deleteAnnotation(annotation)

      assert.calledOnce(highlight.remove)
