/**
 * Webpack configuration for vendor bundles,
 * excluding Annotator.
 */

var path = require('path');
var webpack = require('webpack');

var outDir = __dirname + '/build';

module.exports = {
  entry: require('./vendor-bundles'),

  output: {
    path: outDir,
    filename: '[name].bundle.js',
    library: '[name]_lib',
  },

  plugins: [
    new webpack.DllPlugin({
      path: path.join(outDir, '[name]-manifest.json'),
      name: '[name]_lib',
    }),
  ]
};

