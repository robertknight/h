var webpack = require('webpack');
var ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = {
  entry: {
    // H
    app: './h/static/styles/app.scss',
    inject: ['./h/static/styles/annotator/inject.scss',
             './h/static/styles/annotator/pdfjs-overrides.scss'],
    site: './h/static/styles/site.scss',
    helpPage: './h/static/styles/help-page.scss',
    admin: './h/static/styles/admin.scss',

    // Vendor

    // App
    angularCSP: './h/static/styles/vendor/angular-csp.css',
    angularToastr: 'angular-toastr/dist/angular-toastr.css',
    icomoon: './h/static/styles/vendor/icomoon.css',
    katex: './h/static/styles/vendor/katex.min.css',

    // Admin
    bootstrap: 'bootstrap/dist/css/bootstrap.css',
  },

  output: {
    path: __dirname + '/build/styles/',
    filename: '[name]_style.js',
  },

  module: {
    loaders: [{
      test: /\.(css|scss)$/,
      loader: ExtractTextPlugin.extract(['css','sass']),
    },{
      test: /\.(woff|woff2|eot|ttf)$/,
      loader: 'file?name=fonts/[name].[ext]',
    },{
      test: /\.(png|jpg|svg)$/,
      loader: 'file?name=images/[name].[ext]',
    }],
  },

  sassLoader: {
    includePaths: ['node_modules/compass-mixins/lib/'],
  },

  plugins: [
    new ExtractTextPlugin('[name].css'),
  ],
};
