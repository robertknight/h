var ngAnnotatePlugin = require('ng-annotate-webpack-plugin');
var path = require('path');
var webpack = require('webpack');

function nodeModuleDir(name) {
  return path.resolve(__dirname, 'node_modules', name);
}

function useDLL(name) {
  return new webpack.DllReferencePlugin({
    context: '.',
    manifest: require('./build/' + name + '-manifest.json'),
  });
}

var DLL_PLUGINS = Object.keys(require('./vendor-bundles')).map(function (name) {
  return useDLL(name);
});

var GENERIC_BUILD_CONFIG = {
  output: {
    path: __dirname + '/h/static/scripts',
    filename: '[name].bundle.js',
  },

  plugins: DLL_PLUGINS,
};

var SITE_BUILD_CONFIG = Object.assign({}, GENERIC_BUILD_CONFIG, {
  entry: {
    site: './h/static/scripts/site',
  },
});

var INJECTOR_BUILD_CONFIG = Object.assign({}, GENERIC_BUILD_CONFIG, {
  entry: {
    injector: './h/static/scripts/annotator/main',
  },

  module: {
    // listing modules which are known not to contain
    // any CommonJS requires here will speed up
    // the build
    noParse: [
      /h\/static\/scripts\/vendor\/(katex|jwz|wgxpath\.install).js/
    ],

    loaders: [{
      // ES2015 -> ES5 transpilation
      test: /\.js$/,
      loader: 'babel-loader?presets[]=es2015',

      include: [
        path.resolve(__dirname, 'h/static/scripts'),

        // the `dom-*` modules are written in ES2015
        // and do not specify a loader in their
        // package.json files
        nodeModuleDir('dom-seek'),
        nodeModuleDir('dom-anchor-fragment'),
        nodeModuleDir('dom-anchor-text-quote'),
        nodeModuleDir('dom-anchor-text-position'),
        nodeModuleDir('node-iterator-shim'),
      ],

      exclude: [
        // Babel adds 'use strict' to all modules it processes,
        // which is not compatible with the version of Annotator
        // we ship
        path.resolve(__dirname, 'h/static/scripts/vendor'),
      ],
    },{
      test: /\.coffee$/,
      loader: 'coffee-loader',
    },

    // expose jQuery as window.{jQuery,$}
    {
      test: require.resolve('jquery'),
      loader: 'expose?$!expose?jQuery'
    },

    // AnnotatorJS is not a CommonJS module,
    // it sets `this.Annotator` instead
    {
      test: /\/annotator.js/,
      loader: 'exports?this.Annotator',
    },{
      test: /\/annotator.document.js/,
      loader: 'imports?Annotator=annotator'
    }]
  },

  resolve: {
    alias: {
      'annotator': path.resolve(__dirname, 'h/static/scripts/vendor/annotator'),
    },
    extensions: [
      // default list of module extensions
      '', '.webpack.js', '.web.js', '.js',
      // CoffeeScript
      '.coffee'
    ],
  },
});

var SIDEBAR_BUILD_CONFIG = Object.assign({}, GENERIC_BUILD_CONFIG, {
  entry: {
    app: './h/static/scripts/app.coffee',
  },

  output: {
    // TODO - Move the build output to a separate
    // build directory outside the source tree
    // once webassets is no longer in use
    path: __dirname + '/build',
    filename: '[name].bundle.js',
  },

  module: {
    noParse: [
      /\/node_modules\/angular\/angular.js/,
    ],
    loaders: [{
      test: /\.coffee$/,
      loader: 'coffee-loader',
    }]
  },

  resolve: {
    extensions: [
      // default list of module extensions
      '', '.webpack.js', '.web.js', '.js',
      // CoffeeScript
      '.coffee'
    ],
  },

  plugins: [
    // handles '@ngInject' annotations
    new ngAnnotatePlugin({
      add: true,
    }),
  ].concat(DLL_PLUGINS),
});

module.exports = [
  SIDEBAR_BUILD_CONFIG,
  INJECTOR_BUILD_CONFIG,
  SITE_BUILD_CONFIG,
];
