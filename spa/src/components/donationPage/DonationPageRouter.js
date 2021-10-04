import { useEffect, useCallback, useState } from 'react';

// AJAX
import useRequest from 'hooks/useRequest';
import { FULL_PAGE, ORG_STRIPE_ACCOUNT_ID } from 'ajax/endpoints';

// Router
import { useParams } from 'react-router-dom';

// Analytics
import { useAnalyticsContext } from 'components/analytics/AnalyticsContext';
import { HUB_GA_V3_ID } from 'constants/analyticsConstants';

// Children
import SegregatedStyles from 'components/donationPage/SegregatedStyles';
import LiveLoading from 'components/donationPage/live/LiveLoading';
import LivePage404 from 'components/donationPage/live/LivePage404';
import DonationPage from 'components/donationPage/DonationPage';

function DonationPageRouter() {
  const [pageData, setPageData] = useState(null);
  const [stripeAccountId, setStripeAccountId] = useState(null);
  const [display404, setDisplay404] = useState(false);

  const params = useParams();
  const requestFullPage = useRequest();
  const requestOrgStripeAccountId = useRequest();

  const fetchOrgStripeAccountId = useCallback(async () => {
    const requestParams = { revenue_program_slug: params.revProgramSlug };
    requestOrgStripeAccountId(
      { method: 'GET', url: ORG_STRIPE_ACCOUNT_ID, params: requestParams },
      {
        onSuccess: ({ data: responseData }) => {
          setStripeAccountId(responseData.stripe_account_id);
        },
        onFailure: (e) => setDisplay404(true)
      }
    );
  }, [params.revProgramSlug]);

  const { setAnalyticsConfig } = useAnalyticsContext();

  const fetchLivePageContent = useCallback(async () => {
    const { revProgramSlug, pageSlug } = params;
    const requestParams = {
      revenue_program: revProgramSlug,
      page: pageSlug,
      live: 1
    };
    requestFullPage(
      {
        method: 'GET',
        url: FULL_PAGE,
        params: requestParams
      },
      {
        onSuccess: ({ data }) => {
          const {
            google_analytics_v3_id: orgGaV3Id,
            google_analytics_v3_domain: orgGaV3Domain,
            google_analytics_v4_id: orgGaV4Id,
            facebook_pixel_id: orgFbPixelId
          } = data?.revenue_program;
          setAnalyticsConfig({ hubGaV3Id: HUB_GA_V3_ID, orgGaV3Id, orgGaV3Domain, orgGaV4Id, orgFbPixelId });
          setPageData(data);
        },
        onFailure: (e) => {
          setDisplay404(true);
        }
      }
    );
  }, [params]);

  useEffect(() => {
    fetchLivePageContent();
  }, [params, fetchLivePageContent]);

  useEffect(() => {
    fetchOrgStripeAccountId();
  }, [params, fetchOrgStripeAccountId]);

  return (
    <SegregatedStyles page={pageData}>
      {display404 ? (
        <LivePage404 />
      ) : pageData && stripeAccountId ? (
        <DonationPage live page={pageData} stripeAccountId={stripeAccountId} />
      ) : (
        <LiveLoading />
      )}
    </SegregatedStyles>
  );
}

export default DonationPageRouter;
