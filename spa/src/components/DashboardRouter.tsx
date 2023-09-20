import { lazy } from 'react';

// Routing
import ProtectedRoute from 'components/authentication/ProtectedRoute';
import { Redirect } from 'react-router-dom';

import ContributorRouter from 'components/ContributorRouter';
import isContributorAppPath from 'utilities/isContributorAppPath';

// Slugs
import * as ROUTES from 'routes';

// Components/Children
import TrackPageView from 'components/analytics/TrackPageView';

// Utilities
import { SentryRoute } from 'hooks/useSentry';
import componentLoader from 'utilities/componentLoader';
import RouterSetup from './routes/RouterSetup';

// Split bundles
const Main = lazy(() => componentLoader(() => import('components/Main')));
const PortalRouter = lazy(() => componentLoader(() => import('components/PortalRouter')));

// Account Screens
const SignIn = lazy(() => componentLoader(() => import('components/account/SignIn')));
const SignUp = lazy(() => componentLoader(() => import('components/account/SignUp')));
const ForgotPassword = lazy(() => componentLoader(() => import('components/account/ForgotPassword')));
const ResetPassword = lazy(() => componentLoader(() => import('components/account/ResetPassword')));

function DashboardRouter() {
  const isContributorApp = isContributorAppPath();

  if (isContributorApp) return <ContributorRouter />;

  return (
    <RouterSetup>
      <SentryRoute path={Object.values(ROUTES.PORTAL)} render={() => <TrackPageView component={PortalRouter} />} />

      {/* Login URL */}

      <SentryRoute exact path={ROUTES.SIGN_IN} render={() => <TrackPageView component={SignIn} />} />
      <SentryRoute exact path={ROUTES.SIGN_UP} render={() => <TrackPageView component={SignUp} />} />
      <SentryRoute exact path={ROUTES.FORGOT_PASSWORD} render={() => <TrackPageView component={ForgotPassword} />} />
      <SentryRoute exact path={ROUTES.RESET_PASSWORD} render={() => <TrackPageView component={ResetPassword} />} />

      <Redirect from="/verified/:slug" to="/verify-email-success?result=:slug" />
      <Redirect from={ROUTES.VERIFIED} to={ROUTES.VERIFY_EMAIL_SUCCESS} />

      {/* Organization Dashboard */}
      <ProtectedRoute
        path={[
          ROUTES.DASHBOARD_SLUG,
          ROUTES.DONATIONS_SLUG,
          ROUTES.CONTENT_SLUG,
          ROUTES.CUSTOMIZE_SLUG,
          ROUTES.EDITOR_ROUTE,
          ROUTES.VERIFY_EMAIL_SUCCESS,
          ROUTES.PROFILE,
          ROUTES.SETTINGS.INTEGRATIONS,
          ROUTES.SETTINGS.ORGANIZATION,
          ROUTES.MAILCHIMP_OAUTH_SUCCESS_ROUTE,
          ROUTES.SETTINGS.SUBSCRIPTION
        ]}
        render={() => <TrackPageView component={Main} />}
      />

      <Redirect to={ROUTES.CONTENT_SLUG} />
    </RouterSetup>
  );
}

export default DashboardRouter;
