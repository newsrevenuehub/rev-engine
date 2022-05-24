import { Route, Switch, Redirect } from 'react-router-dom';

import * as S from './Dashboard.styled';

// Routing
import { DONATIONS_SLUG, CONTENT_SLUG, EDITOR_ROUTE_PAGE, DASHBOARD_SLUG } from 'routes';

// Children
import { usePaymentProviderContext, useFeatureFlagsProviderContext } from 'components/Main';
import Internal404 from 'components/common/Internal404';
import { PP_STATES } from 'components/connect/BaseProviderInfo';
import DashboardSidebar from 'components/dashboard/sidebar/DashboardSidebar';
import Donations from 'components/donations/Donations';
import Content from 'components/content/Content';
import GlobalLoading from 'elements/GlobalLoading';
import ProviderConnect from 'components/connect/ProviderConnect';
import PageEditor from 'components/pageEditor/PageEditor';

// Feature flag-related
import {
  CONTRIBUTIONS_SECTION_ACCESS_FLAG_NAME,
  CONTENT_SECTION_ACCESS_FLAG_NAME
} from 'constants/featureFlagConstants';

import flagIsActiveForUser from 'utilities/flagIsActiveForUser';

function Dashboard() {
  const { featureFlags } = useFeatureFlagsProviderContext();

  const hasContributionsSectionAccess = flagIsActiveForUser(CONTRIBUTIONS_SECTION_ACCESS_FLAG_NAME, featureFlags);

  const hasContentSectionAccess = flagIsActiveForUser(CONTENT_SECTION_ACCESS_FLAG_NAME, featureFlags);

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
              <Redirect exact from={DASHBOARD_SLUG} to={CONTENT_SLUG} />

              {hasContributionsSectionAccess ? (
                <Route path={DONATIONS_SLUG}>
                  <Donations />
                </Route>
              ) : null}
              {hasContentSectionAccess ? (
                <Route path={CONTENT_SLUG}>
                  <Content />
                </Route>
              ) : null}
              {hasContentSectionAccess ? (
                <Route path={EDITOR_ROUTE_PAGE}>
                  <PageEditor />
                </Route>
              ) : null}
              <Route component={Internal404} />
            </Switch>
          )}
          {getShouldRequireConnect() && <ProviderConnect />}
        </S.DashboardContent>
      </S.DashboardMain>
    </S.Dashboard>
  );
}

export default Dashboard;
