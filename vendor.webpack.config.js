/**
 * Webpack configuration for vendor bundles,
 * excluding Annotator.
 */

var path = require('path');
var webpack = require('webpack');

var outDir = __dirname + '/build';

var optimizationPlugins = [];
if (process.env.NODE_ENV === 'production') {
  optimizationPlugins = [
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false,
      },
    }),
  ];
}

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
  ].concat(optimizationPlugins),
};

