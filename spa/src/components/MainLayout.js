import React, { createContext, useState, useContext, useRef } from 'react';
import * as S from './MainLayout.styled';

import { Route, BrowserRouter, Switch, Redirect } from 'react-router-dom';
import ProtectedRoute from 'components/authentication/ProtectedRoute';

// Slugs
import * as ROUTES from 'routes';

import GlobalConfirmationModal from 'elements/modal/GlobalConfirmationModal';

// Children
import GlobalLoading from 'elements/GlobalLoading';
import ReauthModal from 'components/authentication/ReauthModal';

import HubTrackedRoute from 'analytics/components/HubTrackedRoute';
import OrgAndHubTrackedRoute from 'analytics/components/OrgAndHubTrackedRoute';

// Split bundles
const Login = React.lazy(() => import('components/authentication/Login'));
const Main = React.lazy(() => import('components/Main'));
const GenericThankYou = React.lazy(() => import('components/donationPage/live/thankYou/GenericThankYou'));

const ContributorEntry = React.lazy(() => import('components/contributor/ContributorEntry'));
const ContributorVerify = React.lazy(() => import('components/contributor/ContributorVerify'));
const ContributorDashboard = React.lazy(() =>
  import('components/contributor/contributorDashboard/ContributorDashboard')
);
const PageEditor = React.lazy(() => import('components/pageEditor/PageEditor'));
const DonationPageRouter = React.lazy(() => import('components/donationPage/DonationPageRouter'));

const GlobalContext = createContext(null);

function MainLayout() {
  // Global Context management
  const [confirmationState, setConfirmationState] = useState({});
  const [reauthModalOpen, setReauthModalOpen] = useState(false);

  const reauthCallbacks = useRef([]);

  const getUserConfirmation = (message, onConfirm, onDecline) => {
    setConfirmationState({ message, onConfirm, onDecline, isOpen: true });
  };

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

  return (
    <GlobalContext.Provider value={{ getUserConfirmation, getReauth }}>
      <>
        <S.MainLayout>
          <BrowserRouter>
            <React.Suspense fallback={<GlobalLoading />}>
              <Switch>
                {/* Login URL */}
                <Route exact path={ROUTES.LOGIN} render={() => <HubTrackedRoute component={Login} />} />

                {/* Nothing lives at "/" -- redirect to dashboard  */}
                <Route exact path="/">
                  <Redirect to={ROUTES.MAIN_CONTENT_SLUG} />
                </Route>

                {/* Dashboard */}
                <ProtectedRoute path={ROUTES.MAIN_CONTENT_SLUG} render={() => <HubTrackedRoute component={Main} />} />
                <ProtectedRoute
                  path={ROUTES.EDITOR_ROUTE_PAGE}
                  render={() => <HubTrackedRoute component={PageEditor} />}
                />
                <ProtectedRoute
                  path={ROUTES.EDITOR_ROUTE_REV}
                  render={() => <HubTrackedRoute component={PageEditor} />}
                />

                {/* Contributor Dashboard */}
                <ProtectedRoute
                  path={ROUTES.CONTRIBUTOR_DASHBOARD}
                  render={() => <HubTrackedRoute component={ContributorDashboard} />}
                  contributor
                />

                {/* Contributor Entry */}
                <Route
                  path={ROUTES.CONTRIBUTOR_ENTRY}
                  render={() => <HubTrackedRoute component={ContributorEntry} />}
                />
                <Route
                  path={ROUTES.CONTRIBUTOR_VERIFY}
                  render={() => <HubTrackedRoute component={ContributorVerify} />}
                />

                {/* Live Donation Pages are caught here */}
                <Route
                  path={ROUTES.DONATION_PAGE_SLUG + ROUTES.THANK_YOU_SLUG}
                  render={() => <OrgAndHubTrackedRoute component={GenericThankYou} />}
                />
                <Route
                  path={ROUTES.REV_PROGRAM_SLUG + ROUTES.THANK_YOU_SLUG}
                  render={() => <OrgAndHubTrackedRoute component={GenericThankYou} />}
                />
                <Route
                  path={ROUTES.DONATION_PAGE_SLUG}
                  render={() => <OrgAndHubTrackedRoute component={DonationPageRouter} />}
                />
                <Route path={ROUTES.REV_PROGRAM_SLUG} component={DonationPageRouter} />
              </Switch>
            </React.Suspense>
          </BrowserRouter>
        </S.MainLayout>
        {/* Modals */}
        <GlobalConfirmationModal
          {...confirmationState}
          closeModal={() => setConfirmationState({ ...confirmationState, isOpen: false })}
        />
        <ReauthModal isOpen={reauthModalOpen} callbacks={reauthCallbacks.current} closeModal={closeReauthModal} />
      </>
    </GlobalContext.Provider>
  );
}

export const useGlobalContext = () => useContext(GlobalContext);

export default MainLayout;
