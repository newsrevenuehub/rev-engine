const { defineConfig } = require('cypress');
const webpackPreprocessor = require('@cypress/webpack-preprocessor');

// Our Cypress tests import code from src/. To make this work, we need Cypress
// to use the Webpack config that create-react-app uses.
//
// When we live in a TypeScript world, these kinds of hacks should be unnecessary.
//
// See:
// https://docs.cypress.io/api/plugins/preprocessors-api
// https://github.com/cypress-io/cypress/tree/master/npm/webpack-preprocessor#options

// CRA expects a NODE_ENV to be set.
process.env.NODE_ENV = 'development';
const craWebpackConfig = require('react-scripts/config/webpack.config');

module.exports = defineConfig({
  video: false,
  chromeWebSecurity: false,
  e2e: {
    setupNodeEvents(on, config) {
      const webpackOptions = craWebpackConfig('development');

      // This is a hack to work around a problem Cypress seems to encounter with
      // dynamic imports. Although a lot of Stack Overflow suggests it's caused
      // by MiniCssPlugin, this is a false lead. The code below is a copy/paste
      // from https://github.com/cypress-io/cypress/issues/18435

      const publicPath = '';
      let outputOptions = {};

      Object.defineProperty(webpackOptions, 'output', {
        get: () => {
          return { ...outputOptions, publicPath };
        },
        set: function (x) {
          outputOptions = x;
        }
      });

      // end copy/paste

      on('file:preprocessor', webpackPreprocessor({ webpackOptions, watchOptions: {} }));
    },
    baseUrl: 'http://localhost:3000',
    specPattern: 'cypress/e2e/**/*spec.js'
  },
  component: {
    setupNodeEvents(on, config) {},
    specPattern: 'src/components/**/*spec.js'
  }
});
