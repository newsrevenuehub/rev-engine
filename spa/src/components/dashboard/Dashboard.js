import * as S from './Dashboard.styled';

// Routing
import { Route, Switch } from 'react-router-dom';
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
  const { checkingProvider, defaultPaymentProvider } = useOrganizationContext();

  return (
    <S.Dashboard data-testid="dashboard">
      <DashboardSidebar />
      <S.DashboardMain>
        {checkingProvider && <GlobalLoading />}
        {!checkingProvider && defaultPaymentProvider && (
          <Switch>
            <Route path={DONATIONS_SLUG}>
              <Donations />
            </Route>
            <Route path={CONTENT_SLUG}>
              <Content />
            </Route>
            <Route path={DASHBOARD_SLUG}>
              <Overview />
            </Route>
          </Switch>
        )}
        {!checkingProvider && !defaultPaymentProvider && <ProviderConnect />}
      </S.DashboardMain>
    </S.Dashboard>
  );
}

export default Dashboard;
