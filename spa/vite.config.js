import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

const config = defineConfig({
  plugins: [react(), tsconfigPaths()],
  server: {}
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
