import { useEffect, useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

// AJAX
import useRequest from 'hooks/useRequest';
import axios from 'ajax/axios';
import { LIVE_PAGE_DETAIL, STRIPE_INITIAL_PAYMENT_INTENT } from 'ajax/endpoints';

// Router
import { useParams } from 'react-router-dom';

// Hooks
import useWebFonts from 'hooks/useWebFonts';
import useSubdomain from 'hooks/useSubdomain';

// Analytics
import { useAnalyticsContext } from 'components/analytics/AnalyticsContext';
import { HUB_GA_V3_ID } from 'settings';

// Children
import SegregatedStyles from 'components/donationPage/SegregatedStyles';
import LiveLoading from 'components/donationPage/live/LiveLoading';
import LivePage404 from 'components/common/LivePage404';
import DonationPage from 'components/donationPage/DonationPage';

const STRIPE_IFRAME_SELECTOR = "iframe[title='Secure card payment input frame']";

async function fetchInitialPaymentIntent(rpSlug) {
  return await axios({
    method: 'post',
    url: STRIPE_INITIAL_PAYMENT_INTENT,
    data: { revenue_program: rpSlug }
  }).then((response) => response?.data?.clientSecret);
}

function LiveDonationPageContainer() {
  const [pageData, setPageData] = useState(null);
  const [display404, setDisplay404] = useState(false);

  const subdomain = useSubdomain();
  const params = useParams();
  const requestFullPage = useRequest();

  useWebFonts(pageData?.styles?.font, { context: document.querySelector(STRIPE_IFRAME_SELECTOR) });
  const { setAnalyticsConfig } = useAnalyticsContext();

  // retrieve page data from the API
  const { isSuccess: paymentIntentSuccess, data: stripeClientSecret } = useQuery(
    ['create-intial-payment-intent'],
    () => fetchInitialPaymentIntent(subdomain),
    { refetchOnWindowFocus: false }
  );

  const fetchLivePageContent = useCallback(async () => {
    const { pageSlug } = params;
    const requestParams = {
      revenue_program: subdomain,
      page: pageSlug
    };
    requestFullPage(
      {
        method: 'GET',
        url: LIVE_PAGE_DETAIL,
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
  }, [params, subdomain]);

  useEffect(() => {
    fetchLivePageContent();
  }, [params, fetchLivePageContent]);

  return (
    <SegregatedStyles page={pageData}>
      {display404 ? (
        <LivePage404 />
      ) : pageData && paymentIntentSuccess ? (
        <DonationPage stripeClientSecret={stripeClientSecret} live page={pageData} />
      ) : (
        <LiveLoading />
      )}
    </SegregatedStyles>
  );
}

export default LiveDonationPageContainer;
