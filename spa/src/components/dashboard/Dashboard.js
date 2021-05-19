import * as S from './Dashboard.styled';

// Routing
import { Switch, useRouteMatch } from 'react-router-dom';
import ProtectedRoute from 'components/authentication/ProtectedRoute';
import { DONATIONS_SLUG, CONTENT_SLUG, DASHBOARD_SLUG } from 'routes';

// State
import { useOrganizationContext } from 'components/Main';

// Children
import DashboardSidebar from 'components/dashboard/DashboardSidebar';
import Overview from 'components/overview/Overview';
import Donations from 'components/donations/Donations';
import Content from 'components/content/Content';
import GlobalLoading from 'elements/GlobalLoading';
import ProviderConnect from 'components/connect/ProviderConnect';

function Dashboard() {
  const match = useRouteMatch();
  const { checkingProvider, defaultPaymentProvider } = useOrganizationContext();

  return (
    <S.Dashboard data-testid="dashboard">
      <DashboardSidebar />
      <S.DashboardMain>
        {checkingProvider && <GlobalLoading />}
        {!checkingProvider && defaultPaymentProvider && (
          <Switch>
            <ProtectedRoute path={match.url + DONATIONS_SLUG}>
              <Donations />
            </ProtectedRoute>
            <ProtectedRoute path={match.url + CONTENT_SLUG}>
              <Content />
            </ProtectedRoute>
            <ProtectedRoute path={DASHBOARD_SLUG}>
              <Overview />
            </ProtectedRoute>
          </Switch>
        )}
        {!checkingProvider && !defaultPaymentProvider && <ProviderConnect />}
      </S.DashboardMain>
    </S.Dashboard>
  );
}

export default Dashboard;
