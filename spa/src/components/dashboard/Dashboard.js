import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Route, Switch, Redirect, useLocation, useHistory } from 'react-router-dom';

import * as S from './Dashboard.styled';

// Routing
import { DONATIONS_SLUG, CONTENT_SLUG, EDITOR_ROUTE, EDITOR_ROUTE_PAGE, DASHBOARD_SLUG, CUSTOMIZE_SLUG } from 'routes';

// Children
import { useFeatureFlagsProviderContext } from 'components/Main';
import LivePage404 from 'components/common/LivePage404';
import DashboardSidebar from 'components/dashboard/sidebar/DashboardSidebar';
import DashboardTopbar from 'components/dashboard/topbar/DashboardTopbar';
import Donations from 'components/donations/Donations';
import Content from 'components/content/Content';
import Customize from 'components/content/Customize';
import PageEditor from 'components/pageEditor/PageEditor';

import ConnectStripeElements from 'components/dashboard/connectStripe/ConnectStripeElements';

// Feature flag-related
import { CONTENT_SECTION_ACCESS_FLAG_NAME } from 'constants/featureFlagConstants';

import flagIsActiveForUser from 'utilities/flagIsActiveForUser';
import hasContributionsDashboardAccessToUser from 'utilities/hasContributionsDashboardAccessToUser';
import { usePageContext } from './PageContext';
import { useUserContext } from 'components/UserContext';
import { USER_ROLE_RP_ADMIN_TYPE } from 'constants/authConstants';
import axios from 'ajax/axios';
import { getStripeAccountLinkCreatePath, getStripeAccountLinkCreateCompletePath } from 'ajax/endpoints';

const postAccountLinkSuccess = (rpId) => {
  return axios.post(getStripeAccountLinkCreateCompletePath(rpId));
};

function Dashboard() {
  const { featureFlags } = useFeatureFlagsProviderContext();
  const { page } = usePageContext();
  const { user } = useUserContext();

  const history = useHistory();
  const [revenueProgramIdForVerification, setRevenueProgramIdForVerification] = useState();

  const createStripeAccountLinkMutation = useMutation(
    (revenueProgramId) => axios.post(getStripeAccountLinkCreatePath(revenueProgramId), {}).then(({ data }) => data),
    {
      onError: (err) => {
        debugger;
      },
      onSuccess: ({ url }) => {
        window.location = url;
      }
    }
  );
  const hasContributionsSectionAccess = user?.role_type && hasContributionsDashboardAccessToUser(featureFlags);
  const hasContentSectionAccess =
    user?.role_type && flagIsActiveForUser(CONTENT_SECTION_ACCESS_FLAG_NAME, featureFlags);

  const dashboardSlugRedirect = hasContentSectionAccess
    ? CONTENT_SLUG
    : hasContributionsSectionAccess
    ? DONATIONS_SLUG
    : 'not-found';

  const { pathname, search } = useLocation();
  const isEditPage = pathname.includes(EDITOR_ROUTE);

  /*if user is an rp_admin whose first RP is not verified, we set the id
  of that RP to trigger display of Stripe Connect CTA elements.

  Note that the logic here is unsophisticated. it presumes that the primary
  user (for now) is an rp_admin with a single revenue program. It will not
  cause the Stripe Connect CTA elements to be displayed to users with other role types
  than rp_admin. It also does not support connecting > 1 revenue program beyond
  the first to appear in user.revenue_programs.
  */
  useEffect(() => {
    if (
      user?.role_type?.[0] === USER_ROLE_RP_ADMIN_TYPE &&
      user?.revenue_programs?.[0]?.payment_provider_stripe_verified === false
    ) {
      setRevenueProgramIdForVerification(user.revenue_programs[0].id);
    }
  }, [user?.revenue_programs, user?.role_type]);

  /* After a user goes through the Stripe Account onboarding flow on the Stripe site,
  they get sent back to /stripe-account-link-complete, which (in DashboardRouter.js) redirects
  to the dashboard app route with a `stripeAccountLinkSuccess` present. If this component
  loads and that param is present, we signal to the server that Stripe Account Link is complete,
  and the server will update the revenue program's payment provider's stripe_verified value
  to be `true` if it sees that the account is ready to accept charges.
  */
  useEffect(() => {
    const params = new URLSearchParams(search);
    if (
      revenueProgramIdForVerification &&
      [...params.keys()].includes('stripeAccountLinkSuccess') &&
      !signalStripeAccountLinkSuccess.isLoading &&
      !signalStripeAccountLinkSuccess.isSuccess &&
      !signalStripeAccountLinkSuccess.isError
    ) {
      signalStripeAccountLinkSuccess.mutate(revenueProgramIdForVerification);
    }
  }, [revenueProgramIdForVerification, search, signalStripeAccountLinkSuccess]);

  /*After a user goes through the Stripe Account Link on the Stripe site,
  they will be sent back to the dashboard root but with an empty stripeAccountLinkSuccess
  query param, which signals that we should tell the server to retrieve the Stripe Account
  and update the `stripe_verified` property on the RP's payment provider if the Stripe Account
  is properly configured.
  */
  const queryClient = useQueryClient();
  const signalStripeAccountLinkSuccess = useMutation((rpId) => postAccountLinkSuccess(rpId), {
    onSuccess: () => {
      // NB: `['user']` is meant to refer to a named query generated by useQuery call
      // in spa/src/components/dashboard/main.js. This will cause the user to be refetched,
      // the user's revenue program should now appear as having Stripe verified, which will
      // in turn hide the Stripe Account Link CTAs.
      queryClient.invalidateQueries(['user']);
      setRevenueProgramIdForVerification(null);
      // this removes the `stripeAccountLinkSuccess` query param from route that
      // tells app to ping stripe account link success endpoint on server.
      history.replace(pathname);
    }
  });

  return (
    <S.Outer>
      {revenueProgramIdForVerification && !signalStripeAccountLinkSuccess.isLoading ? (
        <ConnectStripeElements
          revenueProgramId={revenueProgramIdForVerification}
          createStripeAccountLinkMutation={createStripeAccountLinkMutation}
        />
      ) : (
        ''
      )}
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
