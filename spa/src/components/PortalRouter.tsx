import { SentryRoute } from 'hooks/useSentry';
import { lazy } from 'react';
import { Redirect } from 'react-router-dom';
import * as ROUTES from 'routes';
import componentLoader from 'utilities/componentLoader';
import ProtectedRoute from './authentication/ProtectedRoute';
import PortalPage from './portal/PortalPage';
import RouterSetup from './routes/RouterSetup';
import { PortalAuthContextProvider } from 'hooks/usePortalAuth';
import { usePortalPendo } from 'hooks/usePortalPendo';

// Split bundles
const PortalEntry = lazy(() => componentLoader(() => import('components/portal/PortalEntry')));
const PortalVerify = lazy(() => componentLoader(() => import('components/portal/TokenVerification/TokenVerification')));
const TransactionsList = lazy(() =>
  componentLoader(() => import('components/portal/ContributionsList/ContributionsList'))
);

function InnerPortalRouter() {
  usePortalPendo();

  return (
    <RouterSetup>
      {/* These don't get wrapped in <PortalPage> because the component styles it. */}
      <ProtectedRoute path={ROUTES.PORTAL.CONTRIBUTIONS} render={() => <TransactionsList />} contributor exact />
      <ProtectedRoute path={ROUTES.PORTAL.CONTRIBUTION_DETAIL} render={() => <TransactionsList />} contributor />
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
  );
}

// We need this wrapper so that usePendo() in the inner component has access to
// auth context.

const PortalRouter = () => (
  <PortalAuthContextProvider>
    <InnerPortalRouter />
  </PortalAuthContextProvider>
);

export default PortalRouter;
