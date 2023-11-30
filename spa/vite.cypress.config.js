import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import svgr from 'vite-plugin-svgr';
import tsconfigPaths from 'vite-tsconfig-paths';

// This config is used to bundle Cypress test specs only. It does not run on the
// application under test. See cypress.config.js for where this is configured.

module.exports = defineConfig({
  define: {
    // Needed because we reference this in code. Using import.meta.MODE causes
    // problems in Jest.
    'process.env.NODE_ENV': `"${process.env.NODE_ENV}"`
  },
  plugins: [react(), svgr(), tsconfigPaths()]
});
