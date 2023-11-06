import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import checker from 'vite-plugin-checker';
import svgr from 'vite-plugin-svgr';
import tsconfigPaths from 'vite-tsconfig-paths';

const config = defineConfig({
  build: {
    outDir: 'build'
  },
  define: {
    // Needed because we reference this in code. Using import.meta.MODE causes
    // problems in Jest.
    'process.env.NODE_ENV': process.env.NODE_ENV
  },
  plugins: [
    checker({
      eslint: { lintCommand: 'eslint src' },
      overlay: { initialIsOpen: false },
      typescript: true
    }),
    react(),
    svgr(),
    tsconfigPaths()
  ],
  server: {
    host: true,
    // Need this because Django dev server doesn't proxy web sockets.
    hmr: { port: 3001 },
    open: true,
    port: 3000,
    strictPort: true
  }
});

// This is set by some Makefile scripts.

if (!process.env.REACT_APP_NO_PROXY) {
  config.server.proxy = {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true
    }
  };
}

export default config;
