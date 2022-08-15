import React, { lazy } from 'react';

// Routing
import { Route, BrowserRouter, Switch, Redirect } from 'react-router-dom';
import ProtectedRoute from 'components/authentication/ProtectedRoute';

import isContributorAppPath from 'utilities/isContributorAppPath';
import ContributorRouter from 'components/ContributorRouter';

// Slugs
import * as ROUTES from 'routes';

// Components/Children
import GlobalLoading from 'elements/GlobalLoading';
import TrackPageView from 'components/analytics/TrackPageView';
import ChunkErrorBoundary from 'components/errors/ChunkErrorBoundary';

// Utilities
import componentLoader from 'utilities/componentLoader';

// Split bundles
const Main = lazy(() => componentLoader(() => import('components/Main')));
const SignIn = lazy(() => componentLoader(() => import('components/account/SignIn/SignIn')));
const SignUp = lazy(() => componentLoader(() => import('components/account/SignUp/SignUp')));
const Verify = lazy(() => componentLoader(() => import('components/account/Verify/Verify')));
const ForgotPassword = lazy(() => componentLoader(() => import('components/account/ForgotPassword/ForgotPassword')));
const ResetPassword = lazy(() => componentLoader(() => import('components/account/ResetPassword/ResetPassword')));

function DashboardRouter() {
  const isContributorApp = isContributorAppPath();

  if (isContributorApp) return <ContributorRouter />;

  return (
    <BrowserRouter>
      <ChunkErrorBoundary>
        <React.Suspense fallback={<GlobalLoading />}>
          <Switch>
            {/* Account URLs */}
            <Route exact path={ROUTES.SIGN_IN} render={() => <TrackPageView component={SignIn} />} />
            <Route exact path={ROUTES.SIGN_UP} render={() => <TrackPageView component={SignUp} />} />
            <Route exact path={ROUTES.VERIFY_EMAIL_SUCCESS} render={() => <TrackPageView component={Verify} />} />
            <Route exact path={ROUTES.RESET_PASSWORD} render={() => <TrackPageView component={ResetPassword} />} />
            <Route exact path={ROUTES.FORGOT_PASSWORD} render={() => <TrackPageView component={ForgotPassword} />} />

            {/* Organization Dashboard */}
            <ProtectedRoute
              path={[
                ROUTES.DASHBOARD_SLUG,
                ROUTES.DONATIONS_SLUG,
                ROUTES.CONTENT_SLUG,
                ROUTES.CUSTOMIZE_SLUG,
                ROUTES.EDITOR_ROUTE
              ]}
              render={() => <TrackPageView component={Main} />}
            />

            <Redirect to={ROUTES.CONTENT_SLUG} />
          </Switch>
        </React.Suspense>
      </ChunkErrorBoundary>
    </BrowserRouter>
  );
}

export default DashboardRouter;
