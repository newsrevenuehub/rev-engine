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
import.meta.env.NODE_ENV = 'development';
const craWebpackConfig = require('react-scripts/config/webpack.config');

module.exports = defineConfig({
  // Don't save video files of runs.
  video: false,

  // Disable domain restrictions, specifically related to iframes.
  // See https://docs.cypress.io/guides/references/configuration#Browser
  chromeWebSecurity: false,
  e2e: {
    setupNodeEvents(on, config) {
      const webpackOptions = craWebpackConfig('development');

      on('file:preprocessor', webpackPreprocessor({ webpackOptions, watchOptions: {} }));
    },
    baseUrl: 'http://localhost:3000',
    specPattern: 'cypress/e2e/**/*cy.js'
  }
});
