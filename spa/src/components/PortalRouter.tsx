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

  // Redirects from the old contributor portal.

  const redirects = [
    { from: '/contributor/contributions/', to: ROUTES.PORTAL.CONTRIBUTIONS },
    { from: '/contributor/', to: ROUTES.PORTAL.ENTRY },
    { from: '/contributor-verify/', to: { pathname: ROUTES.PORTAL.VERIFY, search } }
  ];

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
      {redirects.map(({ from, to }) => (
        <SentryRoute
          key={from}
          path={from}
          render={() => (
            <TrackPageView>
              <Redirect to={to} />
            </TrackPageView>
          )}
        />
      ))}
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
