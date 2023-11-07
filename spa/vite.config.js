import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import checker from 'vite-plugin-checker';
import svgr from 'vite-plugin-svgr';
import tsconfigPaths from 'vite-tsconfig-paths';

const config = defineConfig({
  // Must match STATIC_URL set in Django.
  base: '/static/',
  build: {
    manifest: true,
    outDir: 'build',
    rollupOptions: {
      // We intentionally don't have an index.html here. Django serves it
      // instead (it's revengine/templates/react_app.html). See
      // https://github.com/MrBin99/django-vite
      input: {
        main: 'src/index.jsx'
      }
    }
  },
  define: {
    // Needed because we reference this in code. Using import.meta.MODE causes
    // problems in Jest.
    'process.env.NODE_ENV': `"${process.env.NODE_ENV}"`
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
    // Need this to serve static images correctly in django-vite.
    // See https://github.com/MrBin99/django-vite/issues/7
    origin: 'http://localhost:3000',
    port: 3000,
    strictPort: true
  }
});

export default config;
