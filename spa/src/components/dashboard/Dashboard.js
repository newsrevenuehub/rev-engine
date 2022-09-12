import { Route, Switch, Redirect, useLocation } from 'react-router-dom';

import * as S from './Dashboard.styled';

// Routing
import {
  DONATIONS_SLUG,
  CONTENT_SLUG,
  EDITOR_ROUTE,
  EDITOR_ROUTE_PAGE,
  DASHBOARD_SLUG,
  CUSTOMIZE_SLUG,
  PROFILE
} from 'routes';

// Children
import { useFeatureFlagsProviderContext } from 'components/Main';
import LivePage404 from 'components/common/LivePage404';
import DashboardSidebar from 'components/dashboard/sidebar/DashboardSidebar';
import DashboardTopbar from 'components/dashboard/topbar/DashboardTopbar';
import Donations from 'components/donations/Donations';
import Content from 'components/content/Content';
import Customize from 'components/content/Customize';
import PageEditor from 'components/pageEditor/PageEditor';
import Profile from 'components/account/Profile';

import userHasSingleRPNotConnectedToStripe from 'components/dashboard/connectStripe/userHasSingleRPNotConnectedToStripe';
import ConnectStripeElements from 'components/dashboard/connectStripe/ConnectStripeElements';

// Feature flag-related
import { CONTENT_SECTION_ACCESS_FLAG_NAME } from 'constants/featureFlagConstants';

import flagIsActiveForUser from 'utilities/flagIsActiveForUser';
import hasContributionsDashboardAccessToUser from 'utilities/hasContributionsDashboardAccessToUser';
import { usePageContext } from './PageContext';
import { useUserContext } from 'components/UserContext';

function Dashboard() {
  const { featureFlags } = useFeatureFlagsProviderContext();
  const { page } = usePageContext();
  const { user } = useUserContext();

  const hasContributionsSectionAccess = user.role_type && hasContributionsDashboardAccessToUser(featureFlags);
  const hasContentSectionAccess = user.role_type && flagIsActiveForUser(CONTENT_SECTION_ACCESS_FLAG_NAME, featureFlags);

  const dashboardSlugRedirect = hasContentSectionAccess
    ? CONTENT_SLUG
    : hasContributionsSectionAccess
    ? DONATIONS_SLUG
    : 'not-found';

  const isEditPage = useLocation().pathname.includes(EDITOR_ROUTE);
  const showConnectToStripeDialogs = userHasSingleRPNotConnectedToStripe(user);

  return (
    <S.Outer>
      {showConnectToStripeDialogs ? <ConnectStripeElements /> : ''}
      <DashboardTopbar isEditPage={isEditPage} page={page} />
      <S.Dashboard data-testid="dashboard">
        {isEditPage ? null : <DashboardSidebar />}
        <S.DashboardMain>
          <S.DashboardContent>
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
              <Route path={PROFILE}>
                <Profile />
              </Route>
              <Route>
                <LivePage404 dashboard />
              </Route>
            </Switch>
          </S.DashboardContent>
        </S.DashboardMain>
      </S.Dashboard>
    </S.Outer>
  );
}

export default Dashboard;
