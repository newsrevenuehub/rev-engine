import { createContext, useContext, useState, useCallback } from 'react';
import * as S from './Dashboard.styled';

// Routing
import { useRouteMatch } from 'react-router-dom';
import ProtectedRoute from 'components/authentication/ProtectedRoute';
import { DONATIONS_SLUG, CONTENT_SLUG } from 'routes';

// AJAX
import axios from 'ajax/axios';
import { USER } from 'ajax/endpoints';
import { LS_USER } from 'constants/authConstants';

// Utils
import getVerifiedPaymentProvider from 'utilities/getVerifiedPaymentProvider';

// Children
import DashboardHeader from 'components/dashboard/DashboardHeader';
import DashboardSidebar from 'components/dashboard/DashboardSidebar';
import Overview from 'components/overview/Overview';
import Donations from 'components/donations/Donations';
import Content from 'components/content/Content';
import GlobalLoading from 'elements/GlobalLoading';
import ProviderConnect from 'components/connect/ProviderConnect';

const OrganizationContext = createContext(null);

function Dashboard() {
  const match = useRouteMatch();
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
    <S.Dashboard data-testid="dashboard">
      <OrganizationContext.Provider
        value={{
          user,
          updateUser,
          defaultPaymentProvider,
          updateDefaultPaymentProvider
        }}
      >
        <DashboardHeader />
        <S.DashBody>
          <DashboardSidebar />
          <S.DashMain>
            {checkingProvider && <GlobalLoading />}
            {!checkingProvider && defaultPaymentProvider && (
              <>
                <ProtectedRoute exact path={match.url}>
                  <Overview />
                </ProtectedRoute>
                <ProtectedRoute path={match.url + DONATIONS_SLUG}>
                  <Donations />
                </ProtectedRoute>
                <ProtectedRoute path={match.url + CONTENT_SLUG}>
                  <Content />
                </ProtectedRoute>
              </>
            )}
            {!checkingProvider && !defaultPaymentProvider && <ProviderConnect />}
          </S.DashMain>
        </S.DashBody>
      </OrganizationContext.Provider>
    </S.Dashboard>
  );
}

export const useOrganizationContext = () => useContext(OrganizationContext);

export default Dashboard;
