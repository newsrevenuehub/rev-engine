import React, { lazy } from 'react';

import { useEffect, useCallback, useState } from 'react';

// AJAX
import useRequest from 'hooks/useRequest';
import { LIVE_PAGE_DETAIL } from 'ajax/endpoints';

// Constants
import { DASHBOARD_SUBDOMAINS } from 'settings';

// Routing
import { Route, BrowserRouter, Switch, Redirect } from 'react-router-dom';
import ProtectedRoute from 'components/authentication/ProtectedRoute';

// Hooks
import useSubdomain from 'hooks/useSubdomain';

// Slugs
import * as ROUTES from 'routes';

// Components/Children
import GlobalLoading from 'elements/GlobalLoading';
import TrackPageView from 'components/analytics/TrackPageView';
import ChunkErrorBoundary from 'components/errors/ChunkErrorBoundary';
import SegregatedStyles from 'components/donationPage/SegregatedStyles';
import DonationPageNavbar from 'components/donationPage/DonationPageNavbar';

// Utilities
import componentLoader from 'utilities/componentLoader';

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
      <BrowserRouter>
        <ChunkErrorBoundary>
          <React.Suspense fallback={<GlobalLoading />}>
            <Switch>
              <ProtectedRoute
                path={ROUTES.CONTRIBUTOR_DASHBOARD}
                render={() => <TrackPageView component={ContributorDashboard} />}
                contributor
              />
              <Route
                path={ROUTES.CONTRIBUTOR_ENTRY}
                render={() => <TrackPageView component={ContributorEntry} page={pageData} />}
              />
              <Route path={ROUTES.CONTRIBUTOR_VERIFY} render={() => <TrackPageView component={ContributorVerify} />} />
            </Switch>
          </React.Suspense>
        </ChunkErrorBoundary>
      </BrowserRouter>
    </SegregatedStyles>
  );
}

export default ContributorRouter;
