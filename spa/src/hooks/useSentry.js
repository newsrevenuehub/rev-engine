import { useEffect } from 'react';

// Sentry
import * as Sentry from '@sentry/react';
import { Integrations } from '@sentry/tracing';

// Const
import { SENTRY_DSN, SENTRY_ENABLE } from 'settings';

/**
 * Typically, just loading sentry at build time is sufficient.
 * However, due to our front-end environment variable pattern,
 * we need to wait till runtime to get the Sentry DSN.
 */
function useSentry() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development' && SENTRY_ENABLE) {
      Sentry.init({
        dsn: SENTRY_DSN,
        integrations: [new Integrations.BrowserTracing()],
        tracesSampleRate: 1.0,
        environment: document.location.hostname
      });
    }
  });
}

export default useSentry;
