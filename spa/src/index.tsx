import { StrictMode } from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import './i18n';
import 'semantic-ui-css/components/reset.css';
import 'semantic-ui-css/components/site.css';

// webpack CSP nonce concession
(window as any).__webpack_nonce__ = (window as any).csp_nonce;

ReactDOM.render(
  <StrictMode>
    <App />
  </StrictMode>,
  document.getElementById('root')
);
