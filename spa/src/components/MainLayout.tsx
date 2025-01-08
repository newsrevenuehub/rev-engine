import { Suspense } from 'react';
import { MainLayoutWrapper } from './MainLayout.styled';

// Hooks
import useSentry from 'hooks/useSentry';
import isPortalAppPath from 'utilities/isPortalAppPath';

// Constants
import { DASHBOARD_SUBDOMAINS } from 'appSettings';

// Analytics
import { AnalyticsContextProvider } from './analytics/AnalyticsContext';

// Children
import { GlobalLoading } from 'components/common/GlobalLoading';
import GlobalConfirmationModal from 'elements/modal/GlobalConfirmationModal';
import DonationPageRouter from 'components/DonationPageRouter';
import DashboardRouter from 'components/DashboardRouter';
import PortalRouter from 'components/PortalRouter';
import ReauthContextProvider from './ReauthContext';
import { getRevenueProgramSlug } from 'utilities/getRevenueProgramSlug';

function MainLayout() {
  useSentry();

  const rpSlug = getRevenueProgramSlug();
  const isPortalApp = isPortalAppPath();
  let Router = DashboardRouter;

  if (!DASHBOARD_SUBDOMAINS.includes(rpSlug) && !isPortalApp) {
    Router = DonationPageRouter;
  }

  if (isPortalApp) {
    Router = PortalRouter;
  }

  return (
    <ReauthContextProvider>
      <AnalyticsContextProvider>
        <GlobalConfirmationModal>
          <MainLayoutWrapper>
            <Suspense fallback={<GlobalLoading />}>
              <Router />
            </Suspense>
          </MainLayoutWrapper>
        </GlobalConfirmationModal>
      </AnalyticsContextProvider>
    </ReauthContextProvider>
  );
}

export default MainLayout;
