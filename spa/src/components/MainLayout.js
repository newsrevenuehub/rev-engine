import React, { createContext, useState, useContext } from 'react';
import * as S from './MainLayout.styled';

import { Route, BrowserRouter, Switch, Redirect } from 'react-router-dom';
import ProtectedRoute from 'components/authentication/ProtectedRoute';

// Slugs
import * as ROUTES from 'routes';

import GlobalConfirmationModal from 'elements/modal/GlobalConfirmationModal';

// Children
import GlobalLoading from 'elements/GlobalLoading';

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

  const getUserConfirmation = (message, onConfirm, onDecline) => {
    setConfirmationState({ message, onConfirm, onDecline, isOpen: true });
  };

  return (
    <GlobalContext.Provider value={{ getUserConfirmation }}>
      <>
        <S.MainLayout>
          <BrowserRouter>
            <React.Suspense fallback={<GlobalLoading />}>
              <Switch>
                {/* Login URL */}
                <Route exact path={ROUTES.LOGIN} component={Login} />

                {/* Nothing lives at "/" -- redirect to dashboard  */}
                <Route exact path="/">
                  <Redirect to={ROUTES.MAIN_CONTENT_SLUG} />
                </Route>

                {/* Dashboard */}
                <ProtectedRoute path={ROUTES.MAIN_CONTENT_SLUG} component={Main} />

                <ProtectedRoute path={ROUTES.EDITOR_ROUTE_PAGE} component={PageEditor} />
                <ProtectedRoute path={ROUTES.EDITOR_ROUTE_REV} component={PageEditor} />

                {/* Contributor Dashboard */}
                <ProtectedRoute path={ROUTES.CONTRIBUTOR_DASHBOARD} component={ContributorDashboard} contributor />

                {/* Contributor Entry */}
                <Route path={ROUTES.CONTRIBUTOR_ENTRY} component={ContributorEntry} />
                <Route path={ROUTES.CONTRIBUTOR_VERIFY} component={ContributorVerify} />

                {/* Live Donation Pages are caught here */}
                <Route path={ROUTES.DONATION_PAGE_SLUG + ROUTES.THANK_YOU_SLUG} component={GenericThankYou} />
                <Route path={ROUTES.REV_PROGRAM_SLUG + ROUTES.THANK_YOU_SLUG} component={GenericThankYou} />
                <Route path={ROUTES.DONATION_PAGE_SLUG} component={DonationPageRouter} />
                <Route path={ROUTES.REV_PROGRAM_SLUG} component={DonationPageRouter} />
              </Switch>
            </React.Suspense>
          </BrowserRouter>
        </S.MainLayout>
        <GlobalConfirmationModal
          {...confirmationState}
          closeModal={() => setConfirmationState({ ...confirmationState, isOpen: false })}
        />
      </>
    </GlobalContext.Provider>
  );
}

export const useGlobalContext = () => useContext(GlobalContext);

export default MainLayout;
