import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';

import { HUB_GA_V3_ID } from 'settings';
import { DRAFT_PAGE_DETAIL } from 'ajax/endpoints';

import { axios } from 'ajax/axios';
import useWebFonts from 'hooks/useWebFonts';

import { useAnalyticsContext } from 'components/analytics/AnalyticsContext';
import DonationPage from 'components/donationPage/DonationPage';
import SegregatedStyles from 'components/donationPage/SegregatedStyles';
import LiveLoading from 'components/donationPage/live/LiveLoading';
import LivePage404 from 'components/common/LivePage404';

const STRIPE_IFRAME_SELECTOR = "iframe[title='Secure card payment input frame']";

const queryClient = new QueryClient();

async function fetchEditorPageData(pageId) {
  return await axios({
    method: 'get',
    url: `${DRAFT_PAGE_DETAIL}/${pageId}/`
  }).data;
}

export default function PreviewPage() {
  const { setAnalyticsConfig, analyticsInstance } = useAnalyticsContext();
  const [display404, setDisplay404] = useState(false);

  const {
    isSuccess: pageQuerySuccess,
    revenueProgram: { orgGaV3Id, orgGaV3Domain, orgGaV4Id, orgFbPixelId },
    ...page
  } = useQuery(['page'], () => fetchEditorPageData(subdomain, pageSlug).catch((err) => setDisplay404(true)));

  const { clientSecret: stripeClientSecret } = useQuery(['paymentIntent'], () =>
    fetchPaymentIntent().catch((err) => setDisplay404(true))
  );

  useEffect(() => {
    if (pageQuerySuccess) {
      setAnalyticsConfig({ hubGaV3Id: HUB_GA_V3_ID, orgGaV3Id, orgGaV3Domain, orgGaV4Id, orgFbPixelId });
    }
  }, [orgGaV3Id, orgGaV3Domain, orgGaV4Id, orgFbPixelId, setAnalyticsConfig, pageQuerySuccess]);

  useWebFonts(page?.styles?.font, { context: document.querySelector(STRIPE_IFRAME_SELECTOR) });

  const isLoading = !stripeClientSecret || !pageQuerySuccess || !analyticsInstance;

  return (
    // <QueryClientProvider client={queryClient}>
    // </>
    <SegregatedStyles page={page}>
      {display404 ? <LivePage404 /> : isLoading ? <LiveLoading /> : <DonationPage live page={page} />}
    </SegregatedStyles>
  );
}
