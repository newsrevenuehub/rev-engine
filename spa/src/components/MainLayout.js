import * as S from './MainLayout.styled';

import { Route, BrowserRouter, Switch, Redirect } from 'react-router-dom';
import ProtectedRoute from 'components/authentication/ProtectedRoute';

// Slugs
import { LOGIN, MAIN_CONTENT_SLUG } from 'routes';

// Children
import Login from 'components/authentication/Login';
import Main from 'components/Main';
import DonationPageRouter from 'components/donationPage/DonationPageRouter';

function MainLayout() {
  return (
    <S.MainLayout>
      <BrowserRouter>
        <Switch>
          <Route exact path={LOGIN}>
            <Login />
          </Route>
          <Route exact path="/">
            <Redirect to={MAIN_CONTENT_SLUG} />
          </Route>

          <ProtectedRoute path={MAIN_CONTENT_SLUG}>
            <Main />
          </ProtectedRoute>

          <Route path="/:revProgramSlug/:pageSlug">
            <DonationPageRouter live />
          </Route>
          <Route path="/:revProgramSlug">
            <DonationPageRouter live />
          </Route>
        </Switch>
      </BrowserRouter>
    </S.MainLayout>
  );
}

export default MainLayout;
