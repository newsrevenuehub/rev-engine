import React from 'react';
import * as S from './MainLayout.styled';

import { Route, BrowserRouter, Switch, Redirect } from 'react-router-dom';
import ProtectedRoute from 'components/authentication/ProtectedRoute';

// Slugs
import * as ROUTES from 'routes';

// Children
import GlobalLoading from 'elements/GlobalLoading';

// Split bundles
const Login = React.lazy(() => import('components/authentication/Login'));
const Main = React.lazy(() => import('components/Main'));
const GenericThankYou = React.lazy(() => import('components/donationPage/live/thankYou/GenericThankYou'));
const DonationPageRouter = React.lazy(() => import('components/donationPage/DonationPageRouter'));

function MainLayout() {
  return (
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

            {/* Live Donation Pages are caught here */}
            <Route path={ROUTES.DONATION_PAGE_SLUG + ROUTES.THANK_YOU_SLUG} component={GenericThankYou} />
            <Route path={ROUTES.REV_PROGRAM_SLUG + ROUTES.THANK_YOU_SLUG} component={GenericThankYou} />
            <Route path={ROUTES.DONATION_PAGE_SLUG} component={DonationPageRouter} />
            <Route path={ROUTES.REV_PROGRAM_SLUG} component={DonationPageRouter} />
          </Switch>
        </React.Suspense>
      </BrowserRouter>
    </S.MainLayout>
  );
}

export default MainLayout;
