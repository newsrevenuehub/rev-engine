import { lazy } from 'react';

import { useQuery } from '@tanstack/react-query';

// AJAX
import { LIVE_PAGE_DETAIL } from 'ajax/endpoints';

// Constants
import { DASHBOARD_SUBDOMAINS } from 'appSettings';

// Routing

// Hooks
import useSubdomain from 'hooks/useSubdomain';

// Slugs
import useWebFonts from 'hooks/useWebFonts';
import * as ROUTES from 'routes';

// Components/Children
import SegregatedStyles from 'components/donationPage/SegregatedStyles';
import DonationPageHeader from './donationPage/DonationPageHeader';

// Utilities
import axios from 'ajax/axios';
import { PLAN_NAMES } from 'constants/orgPlanConstants';
import { ContributionPage } from 'hooks/useContributionPage';
import { SentryRoute } from 'hooks/useSentry';
import { Redirect, Switch } from 'react-router-dom';
import componentLoader from 'utilities/componentLoader';
import TrackPageView from './analytics/TrackPageView';
import ProtectedRoute from './authentication/ProtectedRoute';

// Split bundles
const PortalEntry = lazy(() => componentLoader(() => import('components/portal/PortalEntry')));
const ContributorVerify = lazy(() => componentLoader(() => import('components/contributor/ContributorVerify')));
const ContributorDashboard = lazy(() =>
  componentLoader(() => import('components/contributor/contributorDashboard/ContributorDashboard'))
);

async function fetchPage(rpSlug: string): Promise<ContributionPage> {
  try {
    const { data } = await axios.get(LIVE_PAGE_DETAIL, { params: { revenue_program: rpSlug } });

    return data;
  } catch (error) {
    // Log it for Sentry and rethrow, which should cause the generic error
    // message to appear.
    console.error(error);
    throw error;
  }
}

function PortalRouter() {
  const subdomain = useSubdomain();
  const { data: page, isFetched } = useQuery(['getPage'], () => fetchPage(subdomain), {
    enabled: !DASHBOARD_SUBDOMAINS.includes(subdomain)
  });

  const isFreeOrg = page?.revenue_program?.organization?.plan?.name === PLAN_NAMES.FREE;
  const hasDefaultDonationPage = !!page?.revenue_program?.default_donation_page;
  // If Donation page belongs to a paid org (not Free) and RP has a Default Donation Page, use custom styles
  const renderCustomStyles = !isFreeOrg && hasDefaultDonationPage;

  useWebFonts(page?.styles?.font);

  // If rp has no default page, normal contributor page is shown
  if (!DASHBOARD_SUBDOMAINS.includes(subdomain) && !page && !isFetched) return null;

  return (
    <SegregatedStyles page={renderCustomStyles && page}>
      <DonationPageHeader page={page} />
      <Switch>
        <ProtectedRoute
          path={ROUTES.PORTAL.DASHBOARD}
          // TODO: Update to New Portal Dashboard
          render={() => <TrackPageView component={ContributorDashboard} />}
          contributor
        />
        <SentryRoute
          exact
          path={ROUTES.PORTAL.ENTRY}
          render={() => <TrackPageView component={PortalEntry} page={page} />}
        />
        {/* TODO: Update to New Portal Verify */}
        <SentryRoute path={ROUTES.PORTAL.VERIFY} render={() => <TrackPageView component={ContributorVerify} />} />
        <Redirect to={ROUTES.PORTAL.ENTRY} />
      </Switch>
    </SegregatedStyles>
  );
}

export default PortalRouter;
