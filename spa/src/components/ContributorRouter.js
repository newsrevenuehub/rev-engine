import { lazy } from 'react';

import { useCallback, useEffect, useState } from 'react';

// AJAX
import { LIVE_PAGE_DETAIL } from 'ajax/endpoints';
import useRequest from 'hooks/useRequest';

// Constants
import { DASHBOARD_SUBDOMAINS } from 'settings';

// Routing
import ProtectedRoute from 'components/authentication/ProtectedRoute';

// Hooks
import useSubdomain from 'hooks/useSubdomain';

// Slugs
import useWebFonts from 'hooks/useWebFonts';
import * as ROUTES from 'routes';

// Components/Children
import TrackPageView from 'components/analytics/TrackPageView';
import DonationPageNavbar from 'components/donationPage/DonationPageNavbar';
import SegregatedStyles from 'components/donationPage/SegregatedStyles';

// Utilities
import { SentryRoute } from 'hooks/useSentry';
import componentLoader from 'utilities/componentLoader';
import RouterSetup from './routes/RouterSetup';

// Split bundles
const ContributorEntry = lazy(() => componentLoader(() => import('components/contributor/ContributorEntry')));
const ContributorVerify = lazy(() => componentLoader(() => import('components/contributor/ContributorVerify')));
const ContributorDashboard = lazy(() =>
  componentLoader(() => import('components/contributor/contributorDashboard/ContributorDashboard'))
);

function ContributorRouter() {
  const [pageData, setPageData] = useState(null);
  const [fetchedpageData, setFetchedPageData] = useState(null);

  const subdomain = useSubdomain();
  const requestFullPage = useRequest();

  useWebFonts(pageData?.styles?.font);

  const fetchRPLiveContent = useCallback(async () => {
    const requestParams = {
      revenue_program: subdomain
    };
    requestFullPage(
      {
        method: 'GET',
        url: LIVE_PAGE_DETAIL,
        params: requestParams
      },
      {
        onSuccess: ({ data }) => {
          setPageData(data);
          setFetchedPageData(true);
        },
        onFailure: (e) => {
          setFetchedPageData(true);
        }
      }
    );
  }, [subdomain]);

  useEffect(() => {
    if (!DASHBOARD_SUBDOMAINS.includes(subdomain)) fetchRPLiveContent();
  }, [fetchRPLiveContent]);

  // If rp has no default page, normal contributor page is shown
  if (!DASHBOARD_SUBDOMAINS.includes(subdomain) && !pageData && !fetchedpageData) return null;

  return (
    <SegregatedStyles page={pageData}>
      {pageData ? <DonationPageNavbar page={pageData} /> : null}
      <RouterSetup>
        <ProtectedRoute
          path={ROUTES.CONTRIBUTOR_DASHBOARD}
          render={() => <TrackPageView component={ContributorDashboard} />}
          contributor
        />
        <SentryRoute
          path={ROUTES.CONTRIBUTOR_ENTRY}
          render={() => <TrackPageView component={ContributorEntry} page={pageData} />}
        />
        <SentryRoute path={ROUTES.CONTRIBUTOR_VERIFY} render={() => <TrackPageView component={ContributorVerify} />} />
      </RouterSetup>
    </SegregatedStyles>
  );
}

export default ContributorRouter;
