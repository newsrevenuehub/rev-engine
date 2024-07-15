import { PortalAuthContextProvider } from 'hooks/usePortalAuth';
import { usePortalPendo } from 'hooks/usePortalPendo';
import { SentryRoute } from 'hooks/useSentry';
import { lazy } from 'react';
import { Redirect, useLocation } from 'react-router-dom';
import * as ROUTES from 'routes';
import componentLoader from 'utilities/componentLoader';
import TrackPageView from './analytics/TrackPageView';
import ProtectedRoute from './authentication/ProtectedRoute';
import PortalPage from './portal/PortalPage';
import RouterSetup from './routes/RouterSetup';

// Split bundles
const PortalEntry = lazy(() => componentLoader(() => import('components/portal/PortalEntry')));
const PortalVerify = lazy(() => componentLoader(() => import('components/portal/TokenVerification/TokenVerification')));
const TransactionsList = lazy(() =>
  componentLoader(() => import('components/portal/ContributionsList/ContributionsList'))
);

function InnerPortalRouter() {
  const { search } = useLocation();
  usePortalPendo();

  return (
    <RouterSetup>
      {/* These don't get wrapped in <PortalPage> because the component styles it. */}
      <ProtectedRoute
        path={ROUTES.PORTAL.CONTRIBUTIONS}
        render={() => <TransactionsList />}
        contributorType="PORTAL"
        exact
      />
      <ProtectedRoute
        path={ROUTES.PORTAL.CONTRIBUTION_DETAIL}
        render={() => <TransactionsList />}
        contributorType="PORTAL"
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
      {/* Legacy Contributor Portal - Adds redirects to new Portal */}
      <SentryRoute
        path={ROUTES.CONTRIBUTOR_DASHBOARD}
        render={() => (
          <TrackPageView>
            <Redirect to={ROUTES.PORTAL.CONTRIBUTIONS} />
          </TrackPageView>
        )}
      />
      <SentryRoute
        path={ROUTES.CONTRIBUTOR_ENTRY}
        render={() => (
          <TrackPageView>
            <Redirect to={ROUTES.PORTAL.ENTRY} />
          </TrackPageView>
        )}
      />
      <SentryRoute
        path={ROUTES.CONTRIBUTOR_VERIFY}
        render={() => (
          <TrackPageView>
            <Redirect to={{ pathname: ROUTES.PORTAL.VERIFY, search }} />
          </TrackPageView>
        )}
      />
      {/* End of Legacy Contributor Portal redirect */}
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
