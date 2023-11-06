const { defineConfig } = require('cypress');
const vitePreprocessor = require('cypress-vite');
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import tsconfigPaths from 'vite-tsconfig-paths';

module.exports = defineConfig({
  // Don't save video files of runs.
  video: false,

  // Disable domain restrictions, specifically related to iframes.
  // See https://docs.cypress.io/guides/references/configuration#Browser
  chromeWebSecurity: false,
  e2e: {
    setupNodeEvents(on, config) {
      on(
        'file:preprocessor',
        vitePreprocessor({
          define: {
            'process.env.NODE_ENV': '"cypress"'
          },
          plugins: [react(), svgr(), tsconfigPaths()]
        })
      );
    },
    baseUrl: 'http://localhost:3000',
    specPattern: 'cypress/e2e/**/*cy.js'
  }
});
