import * as S from './Dashboard.styled';

// Routing
import { Route } from 'react-router-dom';
import { DONATIONS_SLUG, CONTENT_SLUG } from 'routes';

// State
import { useGlobalContext } from 'components/MainLayout';
import { useConnectContext } from 'components/Main';
import { PP_STATES } from 'components/connect/BaseProviderInfo';

// Children
import DashboardSidebar from 'components/dashboard/sidebar/DashboardSidebar';
import Donations from 'components/donations/Donations';
import Content from 'components/content/Content';
import GlobalLoading from 'elements/GlobalLoading';
import ProviderConnect from 'components/connect/ProviderConnect';
import MainContentBlocker from 'elements/MainContentBlocker';

export const DASHBOARD_ROUTES = [
  {
    path: CONTENT_SLUG,
    component: Content
  },
  {
    path: DONATIONS_SLUG,
    component: Donations
  }
];

function Dashboard() {
  const { blockMainContentReason } = useGlobalContext();
  const { checkingProvider, paymentProviderConnectState } = useConnectContext();

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
        {blockMainContentReason && <MainContentBlocker message={blockMainContentReason} />}
        {checkingProvider && <GlobalLoading />}
        <S.DashboardContent>
          {getShouldAllowDashboard() && (
            <>
              {DASHBOARD_ROUTES.map((route) => (
                <Route path={route.path} component={route.component} />
              ))}
              =
            </>
          )}
          {getShouldRequireConnect() && <ProviderConnect />}
        </S.DashboardContent>
      </S.DashboardMain>
    </S.Dashboard>
  );
}

export default Dashboard;
