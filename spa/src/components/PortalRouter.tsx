import { SentryRoute } from 'hooks/useSentry';
import { lazy } from 'react';
import { Redirect } from 'react-router-dom';
import * as ROUTES from 'routes';
import componentLoader from 'utilities/componentLoader';
import ProtectedRoute from './authentication/ProtectedRoute';
import PortalPage from './portal/PortalPage';
import RouterSetup from './routes/RouterSetup';
import { PortalAuthContextProvider } from 'hooks/usePortalAuth';

// Split bundles
const PortalEntry = lazy(() => componentLoader(() => import('components/portal/PortalEntry')));
const PortalVerify = lazy(() => componentLoader(() => import('components/portal/TokenVerification/TokenVerification')));
const TransactionsList = lazy(() =>
  componentLoader(() => import('components/portal/ContributionsList/ContributionsList'))
);

function PortalRouter() {
  return (
    <PortalAuthContextProvider>
      <RouterSetup>
        {/* This doesn't get wrapped in <PortalPage> because the component styles it. */}
        <ProtectedRoute path={ROUTES.PORTAL.CONTRIBUTIONS} render={() => <TransactionsList />} contributor exact />
        <ProtectedRoute
          path={ROUTES.PORTAL.CONTRIBUTION_DETAIL}
          render={() => (
            <PortalPage>
              <TransactionsList />
            </PortalPage>
          )}
          contributor
        />
        <SentryRoute
          exact
          path={ROUTES.PORTAL.ENTRY}
          render={() => (
            <PortalPage>
              <PortalEntry />
            </PortalPage>
          )}
        />
        <SentryRoute
          path={ROUTES.PORTAL.VERIFY}
          render={() => (
            <PortalPage>
              <PortalVerify />
            </PortalPage>
          )}
        />
        <Redirect to={ROUTES.PORTAL.ENTRY} />
      </RouterSetup>
    </PortalAuthContextProvider>
  );
}

export default PortalRouter;
