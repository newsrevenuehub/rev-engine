import { useEffect } from 'react';

// Sentry
import * as Sentry from '@sentry/react';
import { Integrations } from '@sentry/tracing';

// Const
import { SENTRY_DSN_FRONTEND, SENTRY_ENABLE_FRONTEND } from 'settings';

/**
 * Typically, just loading sentry at build time is sufficient.
 * However, due to our front-end environment variable pattern,
 * we need to wait till runtime to get the Sentry DSN.
 */
function useSentry() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development' && SENTRY_ENABLE_FRONTEND) {
      Sentry.init({
        dsn: SENTRY_DSN_FRONTEND,
        integrations: [new Integrations.BrowserTracing()],
        tracesSampleRate: 1.0,
        environment: window.ENV['ENVIRONMENT']
      });
    }
  });
}

export default useSentry;
