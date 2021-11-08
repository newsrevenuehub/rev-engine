import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

// Sentry
import * as Sentry from '@sentry/react';
import { Integrations } from '@sentry/tracing';

// Fontawesome config for CSP`
import { config as fontawesomeConfig } from '@fortawesome/fontawesome-svg-core';
import '@fortawesome/fontawesome-svg-core/styles.css';
// import 'node_modules/@fortawesome/fontawesome-svg-core/styles.css';
// Load css via webpack, not via inline styles (fontawesome default)
fontawesomeConfig.autoAddCss = false;

if (process.env.NODE_ENV !== 'development') {
  Sentry.init({
    dsn: 'https://e7c3a0467b6e4474a99922d00cec182e@o168020.ingest.sentry.io/5774473',
    integrations: [new Integrations.BrowserTracing()],
    tracesSampleRate: 1.0,
    environment: document.location.hostname
  });
}

// webpack CSP nonce concession
/* eslint-disable-next-line */
__webpack_nonce__ = window.csp_nonce;

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
