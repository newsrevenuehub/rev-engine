import { createContext, useState, useContext, useRef } from 'react';
import * as S from './MainLayout.styled';

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
import GlobalConfirmationModal from 'elements/modal/GlobalConfirmationModal';
import ReauthModal from 'components/authentication/ReauthModal';
import DonationPageRouter from 'components/DonationPageRouter';
import DashboardRouter from 'components/DashboardRouter';
import PortalRouter from 'components/PortalRouter';

export const GlobalContext = createContext(null);

function MainLayout() {
  useSentry();

  // Global Context management
  const [reauthModalOpen, setReauthModalOpen] = useState(false);

  // Get subdomain for donation-page-routing
  const subdomain = useSubdomain();

  // Store reauth callbacks in ref to persist between renders
  const reauthCallbacks = useRef([]);

  const getReauth = (cb) => {
    /*
      getReauth can be called multiple times per-load. Because of this,
      store references to the callbacks provided each time and call them
      later.
    */
    reauthCallbacks.current.push(cb);
    setReauthModalOpen(true);
  };

  const closeReauthModal = () => {
    // Don't forget to clear out the refs when the modal closes.
    reauthCallbacks.current = [];
    setReauthModalOpen(false);
  };

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
    <GlobalContext.Provider value={{ getReauth }}>
      <AnalyticsContextProvider>
        <GlobalConfirmationModal>
          {/* Route to donation page if subdomain exists */}
          <S.MainLayout>
            <Router />
          </S.MainLayout>
        </GlobalConfirmationModal>
        <ReauthModal isOpen={reauthModalOpen} callbacks={reauthCallbacks.current} closeModal={closeReauthModal} />
      </AnalyticsContextProvider>
    </GlobalContext.Provider>
  );
}

export const useGlobalContext = () => useContext(GlobalContext);

export default MainLayout;
