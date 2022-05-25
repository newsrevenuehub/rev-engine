import * as S from './Dashboard.styled';

// Routing
import { Route, Switch } from 'react-router-dom';
import { DONATIONS_SLUG, CONTENT_SLUG } from 'routes';

// State
import { usePaymentProviderContext } from 'components/Main';
import { PP_STATES } from 'components/connect/BaseProviderInfo';

// Children
import DashboardSidebar from 'components/dashboard/sidebar/DashboardSidebar';
import Donations from 'components/donations/Donations';
import Content from 'components/content/Content';
import GlobalLoading from 'elements/GlobalLoading';
import ProviderConnect from 'components/connect/ProviderConnect';

// Feature flag-related
import { CONTRIBUTIONS_SECTION_ACCESS_FLAG_NAME } from 'constants/featureFlagConstants';
import flagIsActiveForUser from 'utilities/flagIsActiveForUser';
import useFeatureFlags from 'hooks/useFeatureFlags';

function Dashboard() {
  const userFlags = useFeatureFlags();
  const hasContributionsSectionAccess =
    userFlags && userFlags.length && flagIsActiveForUser(CONTRIBUTIONS_SECTION_ACCESS_FLAG_NAME, userFlags);

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
              {hasContributionsSectionAccess && (
                <Route path={DONATIONS_SLUG}>
                  <Donations />
                </Route>
              )}
              <Route path={CONTENT_SLUG}>
                <Content />
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
