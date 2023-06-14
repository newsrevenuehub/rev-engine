import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import tsconfigPaths from 'vite-tsconfig-paths';

const config = defineConfig({
  build: {
    outDir: 'build'
  },
  plugins: [react(), svgr(), tsconfigPaths()],
  server: {
    open: true,
    port: 3000
  }
});

if (!process.env.REACT_APP_NO_PROXY) {
  config.server.proxy = {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true
    }
  };
}

export default config;
