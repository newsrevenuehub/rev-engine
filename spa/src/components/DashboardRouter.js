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
import LivePage404 from './common/LivePage404';

// Split bundles
const Login = lazy(() => componentLoader(() => import('components/authentication/Login')));
const Main = lazy(() => componentLoader(() => import('components/Main')));

function DashboardRouter() {
  const isContributorApp = isContributorAppPath();

  if (isContributorApp) return <ContributorRouter />;

  return (
    <BrowserRouter>
      <ChunkErrorBoundary>
        <React.Suspense fallback={<GlobalLoading />}>
          <Switch>
            {/* Login URL */}
            <Route exact path={ROUTES.LOGIN} render={() => <TrackPageView component={Login} />} />

            {/* Organization Dashboard */}
            <ProtectedRoute path={ROUTES.DASHBOARD_SLUG} render={() => <TrackPageView component={Main} />} />

            <Redirect to={ROUTES.CONTENT_SLUG} />
          </Switch>
        </React.Suspense>
      </ChunkErrorBoundary>
    </BrowserRouter>
  );
}

export default DashboardRouter;
