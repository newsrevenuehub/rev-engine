import { createContext, useContext, useState, useEffect } from 'react';
import * as S from './Dashboard.styled';

// Routing
import { useRouteMatch } from 'react-router-dom';
import ProtectedRoute from 'components/authentication/ProtectedRoute';
import { OVERVIEW_SLUG, DONATIONS_SLUG, CONTENT_SLUG } from 'routes';

// Hooks
import useUser from 'hooks/useUser';

// Utils
import getConfirmedPaymentProvider from 'utilities/getConfirmedPaymentProvider';

// Children
import DashboardHeader from 'components/dashboard/DashboardHeader';
import DashboardSidebar from 'components/dashboard/DashboardSidebar';
import Overview from 'components/overview/Overview';
import Donations from 'components/donations/Donations';
import Content from 'components/content/Content';
import ConnectProvider from 'components/connect/ConnectProvider';

const OrganizationContext = createContext(null);

function Dashboard() {
  const match = useRouteMatch();
  const user = useUser();
  const [confirmedPaymentProvider, setConfirmedPaymentProvider] = useState(false);

  useEffect(() => {
    setConfirmedPaymentProvider(getConfirmedPaymentProvider(user));
  }, [user]);

  return (
    <S.Dashboard>
      <OrganizationContext.Provider
        value={{
          confirmedPaymentProvider
        }}
      >
        <DashboardHeader />
        <S.DashBody>
          <DashboardSidebar />
          <S.DashMain>
            {confirmedPaymentProvider ? (
              <>
                <ProtectedRoute path={match.url + OVERVIEW_SLUG}>
                  <Overview />
                </ProtectedRoute>
                <ProtectedRoute path={match.url + DONATIONS_SLUG}>
                  <Donations />
                </ProtectedRoute>
                <ProtectedRoute path={match.url + CONTENT_SLUG}>
                  <Content />
                </ProtectedRoute>
              </>
            ) : (
              <ConnectProvider />
            )}
          </S.DashMain>
        </S.DashBody>
      </OrganizationContext.Provider>
    </S.Dashboard>
  );
}

export const useOrganizationContext = () => useContext(OrganizationContext);

export default Dashboard;
