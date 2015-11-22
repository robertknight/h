// URL constructor, required by IE 10
window.URL = require('js-polyfills/url').URL;

// document.evaluate() implementation, required by IE
// This sets `window.wgxpath`
require('./vendor/wgxpath.install')
