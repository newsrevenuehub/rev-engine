import { Route, Switch, Redirect, useLocation } from 'react-router-dom';

import * as S from './Dashboard.styled';

// Routing
import { DONATIONS_SLUG, CONTENT_SLUG, EDITOR_ROUTE, EDITOR_ROUTE_PAGE, DASHBOARD_SLUG, CUSTOMIZE_SLUG } from 'routes';

// Children
import LivePage404 from 'components/common/LivePage404';
import DashboardSidebar from 'components/dashboard/sidebar/DashboardSidebar';
import DashboardTopbar from 'components/dashboard/topbar/DashboardTopbar';
import Donations from 'components/donations/Donations';
import Content from 'components/content/Content';
import Customize from 'components/content/Customize';
import PageEditor from 'components/pageEditor/PageEditor';

import ConnectStripeElements from 'components/dashboard/connectStripe/ConnectStripeElements';

// Feature flag-related
import useFeatureFlags from 'hooks/useFeatureFlags';
import { CONTENT_SECTION_ACCESS_FLAG_NAME } from 'constants/featureFlagConstants';

import flagIsActiveForUser from 'utilities/flagIsActiveForUser';
import hasContributionsDashboardAccessToUser from 'utilities/hasContributionsDashboardAccessToUser';
import { usePageContext } from './PageContext';
import useUser from 'hooks/useUser';
import useConnectStripeAccount from 'hooks/useConnectStripeAccount';

function Dashboard() {
  const { flags } = useFeatureFlags();
  const { page } = usePageContext();
  const { user } = useUser();
  const { requiresStripeVerification } = useConnectStripeAccount();

  const hasContributionsSectionAccess = user?.role_type && hasContributionsDashboardAccessToUser(flags);
  const hasContentSectionAccess = user?.role_type && flagIsActiveForUser(CONTENT_SECTION_ACCESS_FLAG_NAME, flags);

  const dashboardSlugRedirect = hasContentSectionAccess
    ? CONTENT_SLUG
    : hasContributionsSectionAccess
    ? DONATIONS_SLUG
    : 'not-found';

  const { pathname } = useLocation();
  const isEditPage = pathname.includes(EDITOR_ROUTE);

  return (
    <S.Outer>
      {requiresStripeVerification ? <ConnectStripeElements /> : ''}
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
