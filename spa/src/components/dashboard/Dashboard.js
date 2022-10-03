import { useMemo } from 'react';
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
import LivePage404 from 'components/common/LivePage404';
import DashboardSidebar from 'components/dashboard/sidebar/DashboardSidebar';
import DashboardTopbar from 'components/dashboard/topbar/DashboardTopbar';
import Donations from 'components/donations/Donations';
import Content from 'components/content/Content';
import Customize from 'components/content/Customize';
import PageEditor from 'components/pageEditor/PageEditor';
import Profile from 'components/account/Profile';

import ConnectStripeElements from 'components/dashboard/connectStripe/ConnectStripeElements';

// Feature flag-related
import useFeatureFlags from 'hooks/useFeatureFlags';
import { CONTENT_SECTION_ACCESS_FLAG_NAME } from 'constants/featureFlagConstants';

import flagIsActiveForUser from 'utilities/flagIsActiveForUser';
import hasContributionsDashboardAccessToUser from 'utilities/hasContributionsDashboardAccessToUser';
import { usePageContext } from './PageContext';
import useUser from 'hooks/useUser';
import useConnectStripeAccount from 'hooks/useConnectStripeAccount';
import { BANNER_TYPE } from 'constants/bannerConstants';

import { usePageListContext } from './PageListContext';

function Dashboard() {
  const { flags } = useFeatureFlags();
  const { pages } = usePageListContext();
  const { page, setPage } = usePageContext();
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

  const bannerType = useMemo(() => {
    const hasPublished = !!pages?.find((_) => _.published_date);
    if (
      user?.role_type.includes('hub_admin') ||
      user?.role_type.includes('Hub Admin') ||
      (user?.revenue_programs?.length || 0) > 1 ||
      pages === undefined
    ) {
      return null;
    }
    if (requiresStripeVerification && !hasPublished) return BANNER_TYPE.STRIPE;
    if (!requiresStripeVerification && !hasPublished) return BANNER_TYPE.PUBLISH;
    return null;
  }, [pages, requiresStripeVerification, user?.revenue_programs?.length, user?.role_type]);

  return (
    <S.Outer>
      {requiresStripeVerification ? <ConnectStripeElements /> : ''}
      <DashboardTopbar isEditPage={isEditPage} page={page} setPage={setPage} />
      <S.Dashboard data-testid="dashboard">
        {isEditPage ? null : <DashboardSidebar />}
        <S.DashboardMain>
          <S.DashboardContent>
            <Switch>
              <Redirect exact from={DASHBOARD_SLUG} to={dashboardSlugRedirect} />

              {hasContributionsSectionAccess ? (
                <Route path={DONATIONS_SLUG}>
                  <Donations bannerType={bannerType} />
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
