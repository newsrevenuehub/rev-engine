import { Redirect, Switch, useLocation } from 'react-router-dom';
import { useSnackbar } from 'notistack';

import GlobalLoading from 'elements/GlobalLoading';
import * as S from './Dashboard.styled';

// Routing
import {
  CONTENT_SLUG,
  CUSTOMIZE_SLUG,
  DASHBOARD_SLUG,
  DONATIONS_SLUG,
  EDITOR_ROUTE,
  EDITOR_ROUTE_PAGE,
  PROFILE
} from 'routes';

// Children
import Profile from 'components/account/Profile';
import LivePage404 from 'components/common/LivePage404';
import Content from 'components/content/Content';
import Customize from 'components/content/Customize';
import DashboardSidebar from 'components/dashboard/sidebar/DashboardSidebar';
import DashboardTopbar from 'components/dashboard/topbar/DashboardTopbar';
import Donations from 'components/donations/Donations';
import PageEditor from 'components/pageEditor/PageEditor';
import SystemNotification from 'components/common/SystemNotification/SystemNotification';

import ConnectStripeElements from 'components/dashboard/connectStripe/ConnectStripeElements';

// Feature flag-related
import { CONTENT_SECTION_ACCESS_FLAG_NAME } from 'constants/featureFlagConstants';
import useFeatureFlags from 'hooks/useFeatureFlags';

import useConnectStripeAccount from 'hooks/useConnectStripeAccount';
import { SentryRoute } from 'hooks/useSentry';
import useUser from 'hooks/useUser';
import flagIsActiveForUser from 'utilities/flagIsActiveForUser';
import hasContributionsDashboardAccessToUser from 'utilities/hasContributionsDashboardAccessToUser';
import { usePageContext } from './PageContext';
import { useEffect } from 'react';

function Dashboard() {
  const { enqueueSnackbar } = useSnackbar();
  const { flags } = useFeatureFlags();
  const { page, setPage, updatedPage } = usePageContext();
  const { user } = useUser();
  const { requiresVerification, displayConnectionSuccess, hideConnectionSuccess, isLoading } =
    useConnectStripeAccount();
  const hasContributionsSectionAccess = user?.role_type && hasContributionsDashboardAccessToUser(flags);
  const hasContentSectionAccess = user?.role_type && flagIsActiveForUser(CONTENT_SECTION_ACCESS_FLAG_NAME, flags);
  const dashboardSlugRedirect = hasContentSectionAccess
    ? CONTENT_SLUG
    : hasContributionsSectionAccess
    ? DONATIONS_SLUG
    : 'not-found';

  const { pathname } = useLocation();
  const isEditPage = pathname.includes(EDITOR_ROUTE);

  useEffect(() => {
    if (displayConnectionSuccess) {
      enqueueSnackbar('Stripe verification has been completed. Your contribution page can now be published!', {
        persist: true,
        content: (key, message) => (
          <S.StripeConnectNotification>
            <SystemNotification id={key} message={message} header="Stripe Successfully Connected!" type="success" />
          </S.StripeConnectNotification>
        )
      });
      hideConnectionSuccess();
    }
  }, [displayConnectionSuccess, enqueueSnackbar, hideConnectionSuccess]);

  return isLoading ? (
    <GlobalLoading />
  ) : (
    <S.Outer>
      {requiresVerification ? <ConnectStripeElements /> : ''}
      <DashboardTopbar isEditPage={isEditPage} page={page} setPage={setPage} user={user} updatedPage={updatedPage} />
      <S.Dashboard data-testid="dashboard">
        {isEditPage ? null : <DashboardSidebar />}
        <S.DashboardMain>
          <S.DashboardContent>
            <Switch>
              <Redirect exact from={DASHBOARD_SLUG} to={dashboardSlugRedirect} />

              {hasContributionsSectionAccess ? (
                <SentryRoute path={DONATIONS_SLUG}>
                  <Donations />
                </SentryRoute>
              ) : null}
              {hasContentSectionAccess ? (
                <SentryRoute path={CONTENT_SLUG}>
                  <Content />
                </SentryRoute>
              ) : null}
              {hasContentSectionAccess ? (
                <SentryRoute path={CUSTOMIZE_SLUG}>
                  <Customize />
                </SentryRoute>
              ) : null}
              {hasContentSectionAccess ? (
                <SentryRoute path={EDITOR_ROUTE_PAGE}>
                  <PageEditor />
                </SentryRoute>
              ) : null}
              <SentryRoute path={PROFILE}>
                <Profile />
              </SentryRoute>
              <SentryRoute>
                <LivePage404 dashboard />
              </SentryRoute>
            </Switch>
          </S.DashboardContent>
        </S.DashboardMain>
      </S.Dashboard>
    </S.Outer>
  );
}

export default Dashboard;
