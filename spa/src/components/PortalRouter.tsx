import { SentryRoute } from 'hooks/useSentry';
import { lazy } from 'react';
import { Redirect, Switch } from 'react-router-dom';
import * as ROUTES from 'routes';
import componentLoader from 'utilities/componentLoader';
import ProtectedRoute from './authentication/ProtectedRoute';
import PortalPage from './portal/PortalPage';

// Split bundles
const PortalEntry = lazy(() => componentLoader(() => import('components/portal/PortalEntry')));
const ContributorVerify = lazy(() => componentLoader(() => import('components/contributor/ContributorVerify')));
const ContributorDashboard = lazy(() =>
  componentLoader(() => import('components/contributor/contributorDashboard/ContributorDashboard'))
);

function PortalRouter() {
  return (
    <Switch>
      <ProtectedRoute
        path={ROUTES.PORTAL.DASHBOARD}
        // TODO: Update to New Portal Dashboard
        render={() => <PortalPage component={ContributorDashboard} />}
        contributor
      />
      <SentryRoute exact path={ROUTES.PORTAL.ENTRY} render={() => <PortalPage component={PortalEntry} />} />
      {/* TODO: Update to New Portal Verify */}
      <SentryRoute path={ROUTES.PORTAL.VERIFY} render={() => <PortalPage component={ContributorVerify} />} />
      <Redirect to={ROUTES.PORTAL.ENTRY} />
    </Switch>
  );
}

export default PortalRouter;
