const findWebpack = require('find-webpack');
const webpackPreprocessor = require('@cypress/webpack-preprocessor');
const createBundler = require('@bahmutov/cypress-esbuild-preprocessor');

// To support Create React App style absolute imports, as per:
// https://github.com/cypress-io/cypress/issues/8481#issuecomment-744683036
module.exports = (on, config) => {
  const webpackOptions = findWebpack.getWebpackOptions();

  if (!webpackOptions) {
    throw new Error('Could not find Webpack in this project 😢');
  }

  const cleanOptions = {
    reactScripts: true
  };

  findWebpack.cleanForCypress(cleanOptions, webpackOptions);

  webpackOptions.module.rules = [
    ...webpackOptions.module.rules,
    {
      type: 'javascript/auto',
      test: /\.mjs$/,
      include: /node_modules/
    }
  ];

  // fix for 'webpack v5 error when module contains dynamic import'
  // Ref: https://github.com/cypress-io/cypress/issues/18435
  const publicPath = ' ';
  let outputOptions;
  Object.defineProperty(webpackOptions, 'output', {
    get: () => {
      return { ...outputOptions, publicPath };
    },
    set: function (x) {
      outputOptions = x;
    }
  });

  const options = {
    webpackOptions,
    watchOptions: {}
  };

  const bundler = createBundler({
    // any ESBuild options here
    // https://esbuild.github.io/api/
  });
  on('file:preprocessor', bundler);
  require('@cypress/react/plugins/react-scripts')(on, config);
  return config;
};
