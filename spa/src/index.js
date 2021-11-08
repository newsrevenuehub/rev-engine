import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

// Sentry
import * as Sentry from '@sentry/react';
import { Integrations } from '@sentry/tracing';

if (process.env.NODE_ENV !== 'development') {
  Sentry.init({
    dsn: 'https://e7c3a0467b6e4474a99922d00cec182e@o168020.ingest.sentry.io/5774473',
    integrations: [new Integrations.BrowserTracing()],
    tracesSampleRate: 1.0,
    environment: document.location.hostname
  });
}

// webpack CSP nonce concession
window.__webpack_nonce__ = window.csp_nonce;

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
