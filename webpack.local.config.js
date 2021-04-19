const path = require('path');
const webpack = require('webpack');
const BundleTracker = require('webpack-bundle-tracker');
const baseConfig = require('./webpack.base.config');
const merge = require('webpack-merge');

module.exports = merge.smart(baseConfig, {
  mode: 'development',
  devtool: 'inline-source-map',
  output: {
    path: path.resolve('./revengine/static/bundles/'),
    filename: '[name].js',
  },
  plugins: [
    new webpack.EvalSourceMapDevToolPlugin({
      exclude: /node_modules/
    }),
    new webpack.NamedModulesPlugin(),
    new BundleTracker({
      filename: './webpack-stats.json',
    }),
  ]
});
