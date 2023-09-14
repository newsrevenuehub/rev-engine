import { useEffect } from 'react';

// Sentry
import * as Sentry from '@sentry/react';
import { CaptureConsole } from '@sentry/integrations';
import { Route, useHistory } from 'react-router-dom';

// Const
import { ENVIRONMENT, SENTRY_DSN_FRONTEND, SENTRY_ENABLE_FRONTEND } from 'appSettings';

/**
 * Typically, just loading sentry at load time is sufficient.
 * However, due to our front-end environment variable pattern,
 * we need to wait till runtime to get the Sentry DSN.
 */
function useSentry() {
  const history = useHistory();

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development' && SENTRY_ENABLE_FRONTEND) {
      Sentry.init({
        dsn: SENTRY_DSN_FRONTEND,
        integrations: [
          // Ref: https://docs.sentry.io/platforms/javascript/guides/react/configuration/integrations/react-router/#react-router-v4v5
          new Sentry.BrowserTracing({
            routingInstrumentation: Sentry.reactRouterV5Instrumentation(history)
          }),
          new CaptureConsole({ levels: ['error'] })
        ],
        tracesSampleRate: 0.3,
        environment: ENVIRONMENT
      });
    }
  });
}

export const SentryRoute = Sentry.withSentryRouting(Route);

export default useSentry;
