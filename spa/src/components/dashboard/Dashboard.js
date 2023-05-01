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
  EDITOR_ROUTE_PAGE_REDIRECT,
  PROFILE,
  SETTINGS,
  MAILCHIMP_OAUTH_SUCCESS_ROUTE
} from 'routes';

// Children
import Profile from 'components/account/Profile';
import LivePage404 from 'components/common/LivePage404';
import Content from 'components/content/Content';
import Customize from 'components/content/Customize';
import DashboardSidebar from 'components/dashboard/sidebar/DashboardSidebar';
import DashboardTopbar from 'components/dashboard/topbar/DashboardTopbar';
import Donations from 'components/donations/Donations';
import Integration from 'components/settings/Integration';
import Organization from 'components/settings/Organization';
import SingleOrgUserOnlyRoute from 'components/authentication/SingleOrgUserOnlyRoute';
import PageEditorRoute from 'components/pageEditor/PageEditorRoute';
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
import { useEffect } from 'react';
import { PageEditorRedirect } from 'components/pageEditor/PageEditorRedirect';
import MailchimpOAuthSuccess from './MailchimpOAuthSuccess';
import Subscription from 'components/settings/Subscription/Subscription';

function Dashboard() {
  const { enqueueSnackbar } = useSnackbar();
  const { flags } = useFeatureFlags();
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
      {!isEditPage && <DashboardTopbar user={user} />}
      <S.Dashboard data-testid="dashboard">
        {!isEditPage && <DashboardSidebar />}
        <S.DashboardMain>
          <S.DashboardContent>
            <Switch>
              <Redirect exact from={DASHBOARD_SLUG} to={dashboardSlugRedirect} />

              <SentryRoute path={MAILCHIMP_OAUTH_SUCCESS_ROUTE}>
                <MailchimpOAuthSuccess />
              </SentryRoute>

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
                  <PageEditorRoute />
                </SentryRoute>
              ) : null}
              {hasContentSectionAccess ? (
                <SentryRoute path={EDITOR_ROUTE_PAGE_REDIRECT}>
                  <PageEditorRedirect />
                </SentryRoute>
              ) : null}
              <SentryRoute path={SETTINGS.INTEGRATIONS}>
                <SingleOrgUserOnlyRoute>
                  <Integration />
                </SingleOrgUserOnlyRoute>
              </SentryRoute>
              <SentryRoute path={SETTINGS.ORGANIZATION}>
                <SingleOrgUserOnlyRoute>
                  <Organization />
                </SingleOrgUserOnlyRoute>
              </SentryRoute>
              <SentryRoute path={SETTINGS.SUBSCRIPTION}>
                <SingleOrgUserOnlyRoute>
                  <Subscription />
                </SingleOrgUserOnlyRoute>
              </SentryRoute>
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
