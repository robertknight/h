var Annotator = require('annotator');

// Scroll plugin for jQuery
// TODO: replace me
require('jquery-scrollintoview')

// Polyfills
var g = Annotator.Util.getGlobal();
if (g.wgxpath) g.wgxpath.install();

// Applications
Annotator.Guest = require('./guest')
Annotator.Host = require('./host')

// Cross-frame communication
Annotator.Plugin.CrossFrame = require('./plugin/cross-frame')
Annotator.Plugin.CrossFrame.Bridge = require('../bridge')
Annotator.Plugin.CrossFrame.AnnotationSync = require('../annotation-sync')
Annotator.Plugin.CrossFrame.Discovery = require('../discovery')

// Bucket bar
require('./plugin/bucket-bar');

// Toolbar
require('./plugin/toolbar');

// Creating selections
require('./plugin/textselection');


var Klass = Annotator.Host;
var docs = 'https://github.com/hypothesis/h/blob/master/README.rst#customized-embedding';
var options = {
  app: jQuery('link[type="application/annotator+html"]').attr('href'),
  BucketBar: {container: '.annotator-frame'},
  Toolbar: {container: '.annotator-frame'}
};

// Document metadata plugins
if (window.PDFViewerApplication) {
  require('./plugin/pdf')
  options['PDF'] = {};
} else {
  require('../vendor/annotator.document');
  options['Document'] = {};
}

if (window.hasOwnProperty('hypothesisRole')) {
  if (typeof window.hypothesisRole === 'function') {
    Klass = window.hypothesisRole;
  } else {
    throw new TypeError('hypothesisRole must be a constructor function, see: ' + docs);
  }
}

if (window.hasOwnProperty('hypothesisConfig')) {
  if (typeof window.hypothesisConfig === 'function') {
    options = jQuery.extend(options, window.hypothesisConfig());
  } else {
    throw new TypeError('hypothesisConfig must be a function, see: ' + docs);
  }
}

Annotator.noConflict().$.noConflict(true)(function () {
  window.annotator = new Klass(document.body, options);
});
