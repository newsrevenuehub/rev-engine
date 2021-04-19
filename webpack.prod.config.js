const webpack = require('webpack');
const path = require('path');
const merge = require('webpack-merge');
const baseConfig = require('./webpack.base.config');

const BundleTracker = require('webpack-bundle-tracker');
//const SentryWebpackPlugin = require('@sentry/webpack-plugin');

module.exports = merge.smart(baseConfig, {
    mode: 'production',
    devtool: 'source-map',
    output: {
        path: path.resolve('./revengine/static/js/bundles/'),
        filename: '[name].js',
    },
    plugins: [
        new BundleTracker({ filename: './webpack-stats-production.json' }),
        // Uncomment the below plugin when sentry is configured.
        // new SentryWebpackPlugin({
        //     include: '.',
        //     // ignoreFile: '.sentrycliignore',
        //     ignore: ['node_modules', 'webpack.prod.config.js'],
        //     configFile: 'sentry.properties'
        // })
    ]
});
