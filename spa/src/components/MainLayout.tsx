import { lazy, Suspense } from 'react';
import { MainLayoutWrapper } from './MainLayout.styled';

// Hooks
import useSentry from 'hooks/useSentry';
import useSubdomain from 'hooks/useSubdomain';
import isContributorAppPath from 'utilities/isContributorAppPath';
import isPortalAppPath from 'utilities/isPortalAppPath';

// Constants
import { DASHBOARD_SUBDOMAINS } from 'appSettings';

// Analytics
import { AnalyticsContextProvider } from './analytics/AnalyticsContext';

// Children
import componentLoader from 'utilities/componentLoader';
import GlobalLoading from 'elements/GlobalLoading';
const DonationPageRouter = lazy(() => componentLoader(() => import('components/DonationPageRouter')));
const DashboardRouter = lazy(() => componentLoader(() => import('components/DashboardRouter')));
const PortalRouter = lazy(() => componentLoader(() => import('components/PortalRouter')));

function MainLayout() {
  useSentry();

  // Get subdomain for donation-page-routing
  const subdomain = useSubdomain();

  const isContributorApp = isContributorAppPath();
  const isPortalApp = isPortalAppPath();

  let Router = DashboardRouter;

  if (!DASHBOARD_SUBDOMAINS.includes(subdomain) && !isContributorApp && !isPortalApp) {
    Router = DonationPageRouter;
  }

  if (isPortalApp) {
    Router = PortalRouter;
  }

  return (
    <AnalyticsContextProvider>
      <MainLayoutWrapper>
        <Suspense fallback={<GlobalLoading />}>
          <Router />
        </Suspense>
      </MainLayoutWrapper>
    </AnalyticsContextProvider>
  );
}

export default MainLayout;
