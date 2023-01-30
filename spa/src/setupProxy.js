// This allows configuring whether CRA will proxy to Django using an environment
// variable. This only affects the local dev server. See
// https://create-react-app.dev/docs/proxying-api-requests-in-development/

const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  if (!process.env.REACT_APP_NO_PROXY) {
    app.use(
      '/api',
      createProxyMiddleware({
        target: 'http://localhost:8000',
        changeOrigin: true
      })
    );
  }
};
