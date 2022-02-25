import React, { createContext, useState, useContext } from 'react';
import * as S from './Main.styled';

// Hooks
import useSubdomain from 'hooks/useSubdomain';

// Constants
import { ORG_PORTAL_SUBDOMAINS } from 'settings';

// Analytics
import { AnalyticsContextWrapper } from './analytics/AnalyticsContext';

// Constants
import * as ROUTES from 'routes';

// Routing
import { Route, BrowserRouter, Switch } from 'react-router-dom';
import ProtectedRoute from 'components/authentication/ProtectedRoute';
import GlobalLoading from 'elements/GlobalLoading';
import ChunkErrorBoundary from 'components/errors/ChunkErrorBoundary';

// Utilities
import componentLoader from 'utilities/componentLoader';

// Children
import GlobalConfirmationModal from 'elements/modal/GlobalConfirmationModal';
import DonationPageRouter from 'components/DonationPageRouter';
import OrgPortalRouter from 'components/OrgPortalRouter';
import TrackPageView from 'components/analytics/TrackPageView';

const ContributorEntry = React.lazy(() => componentLoader(() => import('components/contributor/ContributorEntry')));
const ContributorVerify = React.lazy(() => componentLoader(() => import('components/contributor/ContributorVerify')));
const ContributorDashboard = React.lazy(() =>
  componentLoader(() => import('components/contributor/contributorDashboard/ContributorDashboard'))
);

const GlobalContext = createContext(null);

function Main() {
  // Global Context management

  const [confirmationState, setConfirmationState] = useState({});

  // Get subdomain for donation-page-routing
  const subdomain = useSubdomain();

  const getUserConfirmation = (message, onConfirm, onDecline) => {
    setConfirmationState({ message, onConfirm, onDecline, isOpen: true });
  };

  return (
    <GlobalContext.Provider value={{ getUserConfirmation }}>
      <AnalyticsContextWrapper>
        {/* Route to donation page if subdomain exists */}
        <S.Main>
          <BrowserRouter>
            <ChunkErrorBoundary>
              <React.Suspense fallback={<GlobalLoading />}>
                {/* If the subdomain is not one of the supported org-portal subdomains, user is visiting a live DonationPage */}
                {!ORG_PORTAL_SUBDOMAINS.includes(subdomain) ? (
                  <DonationPageRouter />
                ) : (
                  // Otheriwse, user is visiting either the org-portal, or the contributor-portal
                  <Switch>
                    <ProtectedRoute
                      path={ROUTES.CONTRIBUTOR_DASHBOARD}
                      render={() => <TrackPageView component={ContributorDashboard} />}
                    />
                    <Route
                      path={ROUTES.CONTRIBUTOR_ENTRY}
                      render={() => <TrackPageView component={ContributorEntry} />}
                    />
                    <Route
                      path={ROUTES.CONTRIBUTOR_VERIFY}
                      render={() => <TrackPageView component={ContributorVerify} />}
                    />
                    <Route path="/">
                      <OrgPortalRouter />
                    </Route>
                  </Switch>
                )}
              </React.Suspense>
            </ChunkErrorBoundary>
          </BrowserRouter>
        </S.Main>
        {/* Modals */}
        <GlobalConfirmationModal
          {...confirmationState}
          closeModal={() => setConfirmationState({ ...confirmationState, isOpen: false })}
        />
      </AnalyticsContextWrapper>
    </GlobalContext.Provider>
  );
}

export const useGlobalContext = () => useContext(GlobalContext);

export default Main;
