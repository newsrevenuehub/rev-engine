import { useEffect } from 'react';

// Sentry
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';
import { createBrowserHistory } from 'history';
import { Route } from 'react-router-dom';

// Const
import { ENVIRONMENT, SENTRY_DSN_FRONTEND, SENTRY_ENABLE_FRONTEND } from 'settings';

const history = createBrowserHistory();

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
        integrations: [
          // Ref: https://docs.sentry.io/platforms/javascript/guides/react/configuration/integrations/react-router/#react-router-v4v5
          new BrowserTracing({
            routingInstrumentation: Sentry.reactRouterV5Instrumentation(history as any)
          })
        ],
        tracesSampleRate: 1.0,
        environment: ENVIRONMENT
      });
    }
  });
}

export const SentryRoute = Sentry.withSentryRouting(Route);

export default useSentry;
