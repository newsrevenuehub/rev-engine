import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import browserslistToEsbuild from 'browserslist-to-esbuild';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import checker from 'vite-plugin-checker';
import svgr from 'vite-plugin-svgr';
import tsconfigPaths from 'vite-tsconfig-paths';

const __dirname = dirname(fileURLToPath(import.meta.url));

const config = defineConfig({
  build: {
    // This must match the static asset path used by Django.
    assetsDir: 'static',
    outDir: 'build',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        contributionPage: resolve(__dirname, 'contribution-page.html')
      }
    },
    sourcemap: true,
    target: browserslistToEsbuild(['>0.2%', 'not dead', 'not op_mini all'])
  },
  define: {
    // Needed because we reference this in code. Using import.meta.MODE causes
    // problems in Jest.
    'process.env.NODE_ENV': `"${process.env.NODE_ENV}"`
  },
  optimizeDeps: {
    // Needed because Storybook was showing a "504 Outdated Optimize Dep" error.
    // See https://github.com/vitejs/vite/issues/12434
    exclude: ['sb-vite']
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
    // Accept connections on any hostname.
    allowedHosts: true,
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
      target: 'http://127.0.0.1:8000',
      changeOrigin: true
    },
    '/media': {
      target: 'http://127.0.0.1:8000',
      changeOrigin: true
    }
  };
}

export default config;
