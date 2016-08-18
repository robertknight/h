'use strict';

var Controller = require('../../base/controller');

class TestController extends Controller {
  constructor(element, options) {
    super(element, options);
    this.update = sinon.stub();
  }
}

describe('Controller', function () {
  var ctrl;
  var reloadFn;

  beforeEach(function () {
    var root = document.createElement('div');
    root.innerHTML = '<div data-ref="test"></div>';
    document.body.appendChild(root);
    reloadFn = sinon.stub();
    ctrl = new TestController(root, {reload: reloadFn});
  });

  afterEach(function () {
    ctrl.element.remove();
  });

  it('exposes controllers via the `.controllers` element property', function () {
    assert.equal(ctrl.element.controllers.length, 1);
    assert.instanceOf(ctrl.element.controllers[0], TestController);
  });

  it('exposes elements with "data-ref" attributes on the `refs` property', function () {
    assert.deepEqual(ctrl.refs, {test: ctrl.element.children[0]});
  });

  describe('#setState', function () {
    it('calls update() with new and previous state', function () {
      ctrl.setState({open: true});
      ctrl.update = sinon.stub();
      ctrl.setState({open: true, saving: true});
      assert.calledWith(ctrl.update, {
        open: true,
        saving: true,
      }, {
        open: true,
      });
    });
  });

  describe('#reload', function () {
    it('calls the reload helper passed to the constructor', function () {
      reloadFn.returns({controllers: []});
      ctrl.reload('<div class="is-updated"></div>');
      assert.calledWith(reloadFn, ctrl.element, '<div class="is-updated"></div>');
    });

    it('returns the new controller instance', function () {
      var newController = new TestController(ctrl.element);
      reloadFn.returns({controllers: [newController]});
      assert.equal(ctrl.reload('<div></div>'), newController);
    });
  });

  describe('#trigger', function () {
    it('calls handlers on same controller', function () {
      var receiver = sinon.stub();
      ctrl.on('child-event', receiver);
      ctrl.trigger('child-event');
      assert.calledWithMatch(receiver, sinon.match({type: 'child-event'}));
    });

    it('broadcasts events up to parent controllers', function () {
      var childEl = document.createElement('div');
      var parentEl = document.createElement('div');
      parentEl.appendChild(childEl);

      var childCtrl = new TestController(childEl);
      var parentCtrl = new TestController(parentEl);

      var receiver = sinon.stub();
      parentCtrl.on('child-event', receiver);
      childCtrl.trigger('child-event');
      assert.calledWithMatch(receiver, sinon.match({type: 'child-event'}));
    });
  });
});
