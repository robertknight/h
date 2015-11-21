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
    site: './h/static/scripts/site',
  },
  output: {
    path: __dirname + '/build',
    filename: '[name].bundle.js',
  },
  module: {
    loaders: [{
      // ES2015 -> ES5 transpilation
      test: /\.js$/,
      loader: 'babel-loader?presets[]=es2015',

      include: [
        path.resolve(__dirname, 'h/static/scripts'),
        nodeModuleDir('dom-seek'),
        nodeModuleDir('dom-anchor-fragment'),
        nodeModuleDir('dom-anchor-text-quote'),
        nodeModuleDir('dom-anchor-text-position'),
        nodeModuleDir('node-iterator-shim'),
      ],

      exclude: [
        path.resolve(__dirname, 'h/static/scripts/vendor'),
      ],
    },{
      test: /\.coffee$/,
      loader: 'coffee-loader',
    }],
  },
  resolve: {
    // FIXME
    alias: {
      'annotator': 'exports-loader?Annotator!' + path.resolve(__dirname,
        'h/static/scripts/vendor/annotator.js'),
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
  ]
};
