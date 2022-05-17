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
const Login = lazy(() => componentLoader(() => import('components/authentication/Login')));
const Main = lazy(() => componentLoader(() => import('components/Main')));
const ContributorEntry = lazy(() => componentLoader(() => import('components/contributor/ContributorEntry')));
const ContributorVerify = lazy(() => componentLoader(() => import('components/contributor/ContributorVerify')));
const ContributorDashboard = lazy(() =>
  componentLoader(() => import('components/contributor/contributorDashboard/ContributorDashboard'))
);
const PageEditor = lazy(() => componentLoader(() => import('components/pageEditor/PageEditor')));

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

            {/* Nothing lives at "/" -- redirect to dashboard  */}
            <Route exact path="/">
              <Redirect to={ROUTES.CONTENT_SLUG} />
            </Route>

            {/* Organization Dashboard */}
            <ProtectedRoute path={ROUTES.DASHBOARD_SLUG} render={() => <TrackPageView component={Main} />} />
            <ProtectedRoute path={ROUTES.EDITOR_ROUTE_PAGE} render={() => <TrackPageView component={PageEditor} />} />
          </Switch>
        </React.Suspense>
      </ChunkErrorBoundary>
    </BrowserRouter>
  );
}

export default DashboardRouter;
