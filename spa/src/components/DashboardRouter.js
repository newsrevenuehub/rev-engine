import React, { lazy } from 'react';

// Routing
import { Route, BrowserRouter, Switch, Redirect } from 'react-router-dom';
import ProtectedRoute from 'components/authentication/ProtectedRoute';

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
            <ProtectedRoute path={ROUTES.EDITOR_ROUTE_REV} render={() => <TrackPageView component={PageEditor} />} />

            {/* Contributor Dashboard */}
            <ProtectedRoute
              path={ROUTES.CONTRIBUTOR_DASHBOARD}
              render={() => <TrackPageView component={ContributorDashboard} />}
              contributor
            />
            <Route path={ROUTES.CONTRIBUTOR_ENTRY} render={() => <TrackPageView component={ContributorEntry} />} />
            <Route path={ROUTES.CONTRIBUTOR_VERIFY} render={() => <TrackPageView component={ContributorVerify} />} />
          </Switch>
        </React.Suspense>
      </ChunkErrorBoundary>
    </BrowserRouter>
  );
}

export default DashboardRouter;
