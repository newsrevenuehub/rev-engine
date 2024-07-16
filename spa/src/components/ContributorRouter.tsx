import { lazy } from 'react';

import { useCallback, useEffect, useState } from 'react';

// AJAX
import { LIVE_PAGE_DETAIL } from 'ajax/endpoints';
import useRequest from 'hooks/useRequest';

// Constants
import { DASHBOARD_SUBDOMAINS } from 'appSettings';

// Routing
import ProtectedRoute from 'components/authentication/ProtectedRoute';

// Slugs
import useWebFonts from 'hooks/useWebFonts';
import * as ROUTES from 'routes';

// Components/Children
import TrackPageView from 'components/analytics/TrackPageView';
import DonationPageHeader from './donationPage/DonationPageHeader';
import SegregatedStyles from 'components/donationPage/SegregatedStyles';

// Utilities
import { SentryRoute } from 'hooks/useSentry';
import componentLoader from 'utilities/componentLoader';
import RouterSetup from './routes/RouterSetup';
import { ContributionPage } from 'hooks/useContributionPage';
import { getRevenueProgramSlug } from 'utilities/getRevenueProgramSlug';

// Split bundles
const ContributorEntry = lazy(() => componentLoader(() => import('components/contributor/ContributorEntry')));
const ContributorVerify = lazy(() => componentLoader(() => import('components/contributor/ContributorVerify')));
const ContributorDashboard = lazy(() =>
  componentLoader(() => import('components/contributor/contributorDashboard/ContributorDashboard'))
);

function ContributorRouter() {
  const [pageData, setPageData] = useState<ContributionPage | null>(null);
  const [fetchedPageData, setFetchedPageData] = useState(false);

  const isFreeOrg = pageData?.revenue_program?.organization?.plan?.name === 'FREE';
  const hasDefaultDonationPage = !!pageData?.revenue_program?.default_donation_page;
  // If Donation page belongs to a paid org (not Free) and RP has a Default Donation Page, use custom styles
  const renderCustomStyles = !isFreeOrg && hasDefaultDonationPage;

  const rpSlug = getRevenueProgramSlug();
  const requestFullPage = useRequest();

  useWebFonts(pageData?.styles?.font);

  const fetchRPLiveContent = useCallback(async () => {
    const requestParams = {
      revenue_program: rpSlug
    };
    requestFullPage(
      {
        method: 'GET',
        url: LIVE_PAGE_DETAIL,
        params: requestParams
      },
      {
        onSuccess: ({ data }: { data: ContributionPage }) => {
          setPageData(data);
          setFetchedPageData(true);
        },
        onFailure: () => {
          setFetchedPageData(true);
        }
      }
    );
  }, [requestFullPage, rpSlug]);

  useEffect(() => {
    if (!DASHBOARD_SUBDOMAINS.includes(rpSlug)) fetchRPLiveContent();
  }, [fetchRPLiveContent, rpSlug]);

  // If rp has no default page, normal contributor page is shown
  if (!DASHBOARD_SUBDOMAINS.includes(rpSlug) && !pageData && !fetchedPageData) return null;

  return (
    <SegregatedStyles page={renderCustomStyles && pageData}>
      {renderCustomStyles && <DonationPageHeader page={pageData} />}
      <RouterSetup>
        <ProtectedRoute
          path={ROUTES.CONTRIBUTOR_DASHBOARD}
          render={() => (
            <TrackPageView>
              <ContributorDashboard />
            </TrackPageView>
          )}
          contributorType="CONTRIBUTOR"
        />
        <SentryRoute
          path={ROUTES.CONTRIBUTOR_ENTRY}
          render={() => (
            <TrackPageView>
              <ContributorEntry page={pageData} />
            </TrackPageView>
          )}
        />
        <SentryRoute
          path={ROUTES.CONTRIBUTOR_VERIFY}
          render={() => (
            <TrackPageView>
              <ContributorVerify />
            </TrackPageView>
          )}
        />
      </RouterSetup>
    </SegregatedStyles>
  );
}

export default ContributorRouter;
