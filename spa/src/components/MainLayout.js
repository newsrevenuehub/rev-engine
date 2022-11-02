import React, { createContext, useState, useContext, useRef } from 'react';
import * as S from './MainLayout.styled';

// Hooks
import useSentry from 'hooks/useSentry';
import useSubdomain from 'hooks/useSubdomain';
import isContributorAppPath from 'utilities/isContributorAppPath';

// Constants
import { DASHBOARD_SUBDOMAINS } from 'appSettings';

// Analytics
import { AnalyticsContextWrapper } from './analytics/AnalyticsContext';

// Children
import GlobalConfirmationModal from 'elements/modal/GlobalConfirmationModal';
import ReauthModal from 'components/authentication/ReauthModal';
import DonationPageRouter from 'components/DonationPageRouter';
import DashboardRouter from 'components/DashboardRouter';

const GlobalContext = createContext(null);

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

  return (
    <GlobalContext.Provider value={{ getReauth }}>
      <AnalyticsContextWrapper>
        <GlobalConfirmationModal>
          {/* Route to donation page if subdomain exists */}
          <S.MainLayout>
            {!DASHBOARD_SUBDOMAINS.includes(subdomain) && !isContributorApp ? (
              <DonationPageRouter />
            ) : (
              <DashboardRouter />
            )}
          </S.MainLayout>
        </GlobalConfirmationModal>
        <ReauthModal isOpen={reauthModalOpen} callbacks={reauthCallbacks.current} closeModal={closeReauthModal} />
      </AnalyticsContextWrapper>
    </GlobalContext.Provider>
  );
}

export const useGlobalContext = () => useContext(GlobalContext);

export default MainLayout;
