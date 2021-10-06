import React from 'react';

// Routing
import { Route, BrowserRouter, Switch, Redirect } from 'react-router-dom';
import ProtectedRoute from 'components/authentication/ProtectedRoute';

// Slugs
import * as ROUTES from 'routes';

// Components/Children
import GlobalLoading from 'elements/GlobalLoading';
import TrackPageView from 'components/analytics/TrackPageView';

// Split bundles
const Login = React.lazy(() => import('components/authentication/Login'));
const Main = React.lazy(() => import('components/Main'));
const ContributorEntry = React.lazy(() => import('components/contributor/ContributorEntry'));
const ContributorVerify = React.lazy(() => import('components/contributor/ContributorVerify'));
const ContributorDashboard = React.lazy(() =>
  import('components/contributor/contributorDashboard/ContributorDashboard')
);
const PageEditor = React.lazy(() => import('components/pageEditor/PageEditor'));

function DashboardRouter() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}

export default DashboardRouter;
