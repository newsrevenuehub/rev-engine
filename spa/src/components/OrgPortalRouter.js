import React from 'react';

// Routing
import { Route, BrowserRouter, Switch } from 'react-router-dom';
import ProtectedRoute from 'components/authentication/ProtectedRoute';

// Slugs
import * as ROUTES from 'routes';

import { useConfigureAnalytics } from './analytics';

// Components/Children
import GlobalLoading from 'elements/GlobalLoading';
import TrackPageView from 'components/analytics/TrackPageView';
import ChunkErrorBoundary from 'components/errors/ChunkErrorBoundary';

// Utilities
import componentLoader from 'utilities/componentLoader';

// Split bundles
const Login = React.lazy(() => componentLoader(() => import('components/authentication/Login')));
const Dashboard = React.lazy(() => componentLoader(() => import('components/dashboard/Dashboard')));
const PageEditor = React.lazy(() => componentLoader(() => import('components/pageEditor/PageEditor')));

function OrgPortalRouter() {
  useConfigureAnalytics();
  return (
    <ChunkErrorBoundary>
      <React.Suspense fallback={<GlobalLoading />}>
        <BrowserRouter>
          <Switch>
            <Route path={ROUTES.LOGIN} render={() => <TrackPageView component={Login} />} />
            <ProtectedRoute path={ROUTES.EDITOR_SLUG} render={() => <TrackPageView component={PageEditor} />} />
            <ProtectedRoute path="/" render={() => <TrackPageView component={Dashboard} />} />
          </Switch>
        </BrowserRouter>
      </React.Suspense>
    </ChunkErrorBoundary>
  );
}

export default OrgPortalRouter;
