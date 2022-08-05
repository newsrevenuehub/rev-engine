import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { QueryClient, QueryClientProvider, useMutation, useQuery } from '@tanstack/react-query';
import * as Yup from 'yup';

import { HUB_GA_V3_ID } from 'settings';
import { LIVE_PAGE_DETAIL } from 'ajax/endpoints';

import { axios } from 'ajax/axios';
import useWebFonts from 'hooks/useWebFonts';
import useSubdomain from 'hooks/useSubdomain';

import { useAnalyticsContext } from 'components/analytics/AnalyticsContext';
import SegregatedStyles from 'components/donationPage/SegregatedStyles';
import LiveLoading from 'components/donationPage/live/LiveLoading';
import LivePage404 from 'components/common/LivePage404';
import ContributionForm from './Form';
import { validator as amountValidator } from 'components/donationPage/pageContent/amount';
import { validator as frequencyValidator } from 'components/donationPage/pageContent/frequency';
import { validator as addressValidator } from 'components/donationPage/pageContent/address';
import { validator as donorInfoValidator } from 'components/donationPage/pageContent/contributorInfo';

const STRIPE_IFRAME_SELECTOR = "iframe[title='Secure card payment input frame']";

const queryClient = new QueryClient();
const stripePromise = loadStripe('');

// this represents 1 USD
const DEFAULT_PAYMENT_INTENT_AMOUNT = 100;

async function fetchLivePageData(rpSlug, pageSlug) {
  return await axios({
    method: 'get',
    url: LIVE_PAGE_DETAIL,
    params: { revenue_program: rpSlug, page: pageSlug }
  }).data;
}

async function fetchPaymentIntent(amount, currency, defaultCurrency = 'usd') {
  return await axios({
    method: 'post',
    url: null,
    data: { amount, currency: currency || defaultCurrency }
  }).data;
}

const validationSchema = Yup.object({
  ...amountValidator,
  ...frequencyValidator,
  ...addressValidator,
  ...donorInfoValidator,
  ...givingReasonsValidator,
  ...memberBenefitsValidator,
});

export default function LivePage() {
  const { setAnalyticsConfig, analyticsInstance } = useAnalyticsContext();

  const subdomain = useSubdomain();
  const { pageSlug } = useParams();
  const [display404, setDisplay404] = useState(false);

  const {
    isSuccess: pageQuerySuccess,
    revenueProgram: { orgGaV3Id, orgGaV3Domain, orgGaV4Id, orgFbPixelId },
    ...page
  } = useQuery(['page'], () => fetchLivePageData(subdomain, pageSlug).catch((err) => setDisplay404(true)));

  const { clientSecret: stripeClientSecret } = useQuery(['paymentIntent'], () =>
    fetchPaymentIntent().catch((err) => setDisplay404(true))
  );

  useEffect(() => {
    if (pageQuerySuccess) {
      setAnalyticsConfig({ hubGaV3Id: HUB_GA_V3_ID, orgGaV3Id, orgGaV3Domain, orgGaV4Id, orgFbPixelId });
    }
  }, [orgGaV3Id, orgGaV3Domain, orgGaV4Id, orgFbPixelId, setAnalyticsConfig, pageQuerySuccess]);

  useWebFonts(page?.styles?.font, { context: document.querySelector(STRIPE_IFRAME_SELECTOR) });

  const isLoading = !stripeClientSecret || !pageQuerySuccess || !analyticsInstance ;

  const onSubmit = useMutation(formData => {
    https://stripe.com/docs/payments/quickstart
  })

  return (
    <SegregatedStyles page={page}>
      {display404 ? (
        <LivePage404 />
      ) : isLoading ? (
        <LiveLoading />
      ) : (
        <ContributionForm
          dynamicElements={page?.elements}
          onSubmit={() => {}}
          validationSchema={validationSchema}
          buttonText="Contribute!"
        />
      )}
    </SegregatedStyles>
  );
}
