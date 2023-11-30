const { defineConfig } = require('cypress');
const path = require('path');
const vitePreprocessor = require('cypress-vite');

module.exports = defineConfig({
  // Don't save video files of runs.
  video: false,
  // Disable domain restrictions, specifically related to iframes.
  // See https://docs.cypress.io/guides/references/configuration#Browser
  chromeWebSecurity: false,
  defaultCommandTimeout: 15000,
  requestTimeout: 15000,
  e2e: {
    setupNodeEvents(on, config) {
      on('file:preprocessor', vitePreprocessor({ configFile: path.resolve(__dirname, './vite.cypress.config.js') }));
    },
    baseUrl: 'http://localhost:3000',
    specPattern: 'cypress/e2e/**/*cy.js'
  }
});
