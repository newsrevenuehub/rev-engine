import { StrictMode } from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import './i18n';

// Fontawesome config for CSP`
import { config as fontawesomeConfig } from '@fortawesome/fontawesome-svg-core';
import '@fortawesome/fontawesome-svg-core/styles.css';
// import 'node_modules/@fortawesome/fontawesome-svg-core/styles.css';
// Load css via webpack, not via inline styles (fontawesome default)
fontawesomeConfig.autoAddCss = false;

// webpack CSP nonce concession
/* eslint-disable-next-line */
__webpack_nonce__ = window.csp_nonce;

ReactDOM.render(
  <StrictMode>
    <App />
  </StrictMode>,
  document.getElementById('root')
);
