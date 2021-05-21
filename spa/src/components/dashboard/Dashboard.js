import * as S from './Dashboard.styled';

// Routing
import { Route, Switch } from 'react-router-dom';
import { DONATIONS_SLUG, CONTENT_SLUG, MAIN_CONTENT_SLUG } from 'routes';

// State
import { useOrganizationContext } from 'components/Main';
import { PP_STATES } from 'components/connect/BaseProviderInfo';

// Children
import DashboardSidebar from 'components/dashboard/DashboardSidebar';
import Overview from 'components/overview/Overview';
import Donations from 'components/donations/Donations';
import Content from 'components/content/Content';
import GlobalLoading from 'elements/GlobalLoading';
import ProviderConnect from 'components/connect/ProviderConnect';

function Dashboard() {
  const { checkingProvider, paymentProviderConnectState } = useOrganizationContext();

  const getShouldAllowDashboard = () => {
    const isConnected =
      paymentProviderConnectState === PP_STATES.CONNECTED || paymentProviderConnectState === PP_STATES.RESTRICTED;
    return !checkingProvider && isConnected;
  };

  const getShouldRequireConnect = () => {
    const notConnected =
      paymentProviderConnectState === PP_STATES.NOT_CONNECTED || paymentProviderConnectState === PP_STATES.FAILED;
    return !checkingProvider && notConnected;
  };

  return (
    <S.Dashboard data-testid="dashboard">
      <DashboardSidebar />
      <S.DashboardMain>
        {checkingProvider && <GlobalLoading />}
        {getShouldAllowDashboard() && (
          <Switch>
            <Route path={DONATIONS_SLUG}>
              <Donations />
            </Route>
            <Route path={CONTENT_SLUG}>
              <Content />
            </Route>
            <Route path={MAIN_CONTENT_SLUG}>
              <Overview />
            </Route>
          </Switch>
        )}
        {getShouldRequireConnect() && <ProviderConnect />}
      </S.DashboardMain>
    </S.Dashboard>
  );
}

export default Dashboard;
