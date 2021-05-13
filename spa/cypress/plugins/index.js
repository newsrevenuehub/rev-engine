const findWebpack = require('find-webpack');
const webpackPreprocessor = require('@cypress/webpack-preprocessor');

// To support Create React App style absolute imports, as per:
// https://github.com/cypress-io/cypress/issues/8481#issuecomment-744683036
module.exports = (on) => {
  const webpackOptions = findWebpack.getWebpackOptions();

  if (!webpackOptions) {
    throw new Error('Could not find Webpack in this project 😢');
  }

  const cleanOptions = {
    reactScripts: true
  };

  findWebpack.cleanForCypress(cleanOptions, webpackOptions);

  const options = {
    webpackOptions,
    watchOptions: {}
  };

  on('file:preprocessor', webpackPreprocessor(options));
};
