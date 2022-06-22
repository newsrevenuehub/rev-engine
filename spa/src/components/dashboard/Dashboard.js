import { Route, Switch, Redirect, useLocation } from 'react-router-dom';

import * as S from './Dashboard.styled';

// Routing
import { DONATIONS_SLUG, CONTENT_SLUG, EDITOR_ROUTE_PAGE, DASHBOARD_SLUG, CUSTOMIZE_SLUG } from 'routes';

// Children
import { usePaymentProviderContext, useFeatureFlagsProviderContext } from 'components/Main';
import LivePage404 from 'components/common/LivePage404';
import { PP_STATES } from 'components/connect/BaseProviderInfo';
import DashboardSidebar from 'components/dashboard/sidebar/DashboardSidebar';
import DashboardTopbar from 'components/dashboard/topbar/DashboardTopbar';
import Donations from 'components/donations/Donations';
import Content from 'components/content/Content';
import Customize from 'components/content/Customize';
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

  const dashboardSlugRedirect = hasContentSectionAccess
    ? CONTENT_SLUG
    : hasContributionsSectionAccess
    ? DONATIONS_SLUG
    : 'not-found';

  const isEditPage = useLocation().pathname.includes('/dashboard/edit');

  return (
    <S.Outer>
      {isEditPage ? null : <DashboardTopbar shouldAllowDashboard={getShouldAllowDashboard()} />}
      <S.Dashboard data-testid="dashboard">
        {isEditPage ? null : <DashboardSidebar shouldAllowDashboard={getShouldAllowDashboard()} />}
        <S.DashboardMain>
          {checkingProvider && <GlobalLoading />}
          <S.DashboardContent>
            {getShouldAllowDashboard() && (
              <Switch>
                <Redirect exact from={DASHBOARD_SLUG} to={dashboardSlugRedirect} />

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
                  <Route path={CUSTOMIZE_SLUG}>
                    <Customize />
                  </Route>
                ) : null}
                {hasContentSectionAccess ? (
                  <Route path={EDITOR_ROUTE_PAGE}>
                    <PageEditor />
                  </Route>
                ) : null}
                <Route>
                  <LivePage404 dashboard />
                </Route>
              </Switch>
            )}
            {getShouldRequireConnect() && <ProviderConnect />}
          </S.DashboardContent>
        </S.DashboardMain>
      </S.Dashboard>
    </S.Outer>
  );
}

export default Dashboard;
