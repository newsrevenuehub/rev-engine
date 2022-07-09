import { Route, Switch, Redirect, useLocation } from 'react-router-dom';

import * as S from './Dashboard.styled';

// Routing
import { DONATIONS_SLUG, CONTENT_SLUG, EDITOR_ROUTE_PAGE, DASHBOARD_SLUG, CUSTOMIZE_SLUG } from 'routes';

// Children
import { useFeatureFlagsProviderContext } from 'components/Main';
import LivePage404 from 'components/common/LivePage404';
import DashboardSidebar from 'components/dashboard/sidebar/DashboardSidebar';
import DashboardTopbar from 'components/dashboard/topbar/DashboardTopbar';
import Donations from 'components/donations/Donations';
import Content from 'components/content/Content';
import Customize from 'components/content/Customize';
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

  const dashboardSlugRedirect = hasContentSectionAccess
    ? CONTENT_SLUG
    : hasContributionsSectionAccess
    ? DONATIONS_SLUG
    : 'not-found';

  return (
    <S.Outer>
      <DashboardTopbar />
      <S.Dashboard data-testid="dashboard">
        <DashboardSidebar />
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
