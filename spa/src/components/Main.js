import { createContext, useContext, useState, useCallback } from 'react';
import * as S from './Main.styled';

import { Route, BrowserRouter } from 'react-router-dom';
import ProtectedRoute from 'components/authentication/ProtectedRoute';

// Slugs
import { LOGIN, DASHBOARD_SLUG, ORG_SLUG } from 'routes';

// Utils
import getVerifiedPaymentProvider from 'utilities/getVerifiedPaymentProvider';

// AJAX
import axios from 'ajax/axios';
import { USER } from 'ajax/endpoints';
import { LS_USER } from 'constants/authConstants';

// Children
import MainHeader from 'components/header/MainHeader';
import Dashboard from 'components/dashboard/Dashboard';
import Organization from 'components/organization/Organization';
import Login from './authentication/Login';

const OrganizationContext = createContext(null);

function Main() {
  const [checkingProvider, setCheckingProvider] = useState(false);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem(LS_USER)));
  const [defaultPaymentProvider, setDefaultPaymentProvider] = useState(getVerifiedPaymentProvider(user));

  const updateDefaultPaymentProvider = useCallback((updatedUser) => {
    setCheckingProvider(true);
    setDefaultPaymentProvider(getVerifiedPaymentProvider(updatedUser));
    setCheckingProvider(false);
  }, []);

  const updateUser = useCallback(
    async (refetch = false) => {
      let updatedUser = JSON.parse(localStorage.getItem(LS_USER));
      if (refetch) {
        try {
          const { data } = await axios.get(USER);
          updatedUser = data;
        } catch (e) {
          console.warn(e?.response);
        }
      }
      localStorage.setItem(LS_USER, JSON.stringify(updatedUser));
      updateDefaultPaymentProvider(updatedUser);
      setUser(updatedUser);
      return updatedUser;
    },
    [updateDefaultPaymentProvider]
  );

  return (
    <OrganizationContext.Provider
      value={{
        user,
        updateUser,
        defaultPaymentProvider,
        updateDefaultPaymentProvider,
        checkingProvider,
        setCheckingProvider
      }}
    >
      <S.Main>
        <BrowserRouter>
          <Route path={LOGIN}>
            <Login />
          </Route>
          <ProtectedRoute path="/">
            <MainHeader />
            <S.MainContent>
              <Route path={'/' + ORG_SLUG}>
                <Organization />
              </Route>
              <Route exact path={DASHBOARD_SLUG}>
                <Dashboard />
              </Route>
            </S.MainContent>
          </ProtectedRoute>
        </BrowserRouter>
      </S.Main>
    </OrganizationContext.Provider>
  );
}

export const useOrganizationContext = () => useContext(OrganizationContext);

export default Main;
