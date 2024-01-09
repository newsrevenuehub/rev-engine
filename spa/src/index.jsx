import { StrictMode } from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import './i18n';

// webpack CSP nonce concession
__webpack_nonce__ = window.csp_nonce;

ReactDOM.render(
  <StrictMode>
    <App />
  </StrictMode>,
  document.getElementById('root')
);
