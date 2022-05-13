import * as S from './Dashboard.styled';

// Routing
import { Route, Switch } from 'react-router-dom';
import { DONATIONS_SLUG, CONTENT_SLUG } from 'routes';

// State
import { usePaymentProviderContext } from 'components/Main';
import { PP_STATES } from 'components/connect/BaseProviderInfo';

import LivePage404 from 'components/donationPage/live/LivePage404';

// Children
import DashboardSidebar from 'components/dashboard/sidebar/DashboardSidebar';
import Donations from 'components/donations/Donations';
import Content from 'components/content/Content';
import GlobalLoading from 'elements/GlobalLoading';
import ProviderConnect from 'components/connect/ProviderConnect';

function Dashboard() {
  const { checkingProvider, paymentProviderConnectState } = usePaymentProviderContext();

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
      <DashboardSidebar shouldAllowDashboard={getShouldAllowDashboard()} />
      <S.DashboardMain>
        {checkingProvider && <GlobalLoading />}
        <S.DashboardContent>
          {getShouldAllowDashboard() && (
            <Switch>
              <Route path={DONATIONS_SLUG}>
                <Donations />
              </Route>
              <Route path={CONTENT_SLUG}>
                <Content />
              </Route>
              <Route>
                <LivePage404 dashboard />
              </Route>
            </Switch>
          )}
          {getShouldRequireConnect() && <ProviderConnect />}
        </S.DashboardContent>
      </S.DashboardMain>
    </S.Dashboard>
  );
}

export default Dashboard;
