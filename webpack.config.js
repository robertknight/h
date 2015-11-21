var ngAnnotatePlugin = require('ng-annotate-webpack-plugin');
var path = require('path');

function nodeModuleDir(name) {
  return path.resolve(__dirname, 'node_modules', name);
}

module.exports = {
  entry: {
    // JS bundles
    hypothesis: './h/static/scripts/annotator/main',
    app: './h/static/scripts/app.coffee',
    config: './h/static/scripts/config/module',
    site: './h/static/scripts/site',
  },

  output: {
    // TODO - Move the build output to a separate
    // 'build' directory once webassets is no longer
    // in use
    path: __dirname + '/h/static/scripts',
    filename: '[name].bundle.js',
  },

  module: {
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

  externals: [{
    'angular': 'var angular',
  }],

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

  plugins: [
    // handles '@ngInject' annotations
    new ngAnnotatePlugin({
      add: true,
    })
  ],
};
