import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

import * as Sentry from '@sentry/react';

if (process.env.NODE_ENV !== 'development') Sentry.init({ dsn: process.env.REACT_APP_SENTRY_DSN || '' });

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
