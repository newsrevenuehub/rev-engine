import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { useQuery } from '@tanstack/react-query';
import { Elements } from '@stripe/react-stripe-js';

import { HUB_GA_V3_ID, HUB_STRIPE_API_PUB_KEY } from 'settings';
import { LIVE_PAGE_DETAIL, STRIPE_PAYMENT } from 'ajax/endpoints';

import axios from 'ajax/axios';
import useWebFonts from 'hooks/useWebFonts';
import useSubdomain from 'hooks/useSubdomain';

import { useAnalyticsContext } from 'components/analytics/AnalyticsContext';
import SegregatedStyles from 'components/donationPage/elements/SegregatedStyles';
import LiveLoading from 'components/donationPage/elements/loading/LiveLoading';
import LivePage404 from 'components/common/LivePage404';
import DonationPage from 'components/donationPage/DonationPage';

const STRIPE_IFRAME_SELECTOR = "iframe[title='Secure card payment input frame']";

const stripePromise = loadStripe(HUB_STRIPE_API_PUB_KEY);

// this represents 1 USD
const DEFAULT_PAYMENT_INTENT_AMOUNT = 100;

async function fetchLivePageData(rpSlug, pageSlug) {
  return await axios({
    method: 'get',
    url: LIVE_PAGE_DETAIL,
    params: { revenue_program: rpSlug, page: pageSlug }
  }).then((response) => response.data);
}
// get dummy payment intent
async function fetchPaymentIntent(amount, currency, defaultCurrency = 'usd') {
  return await axios({
    method: 'post',
    url: STRIPE_PAYMENT,
    data: { amount, currency: currency || defaultCurrency, interval: 'one_time' }
  }).then((response) => {
    debugger;
  });
}

// convenience function used to extract data from page data from API
// to configure fields in donation form.
const getDataFromPage = (page) => {
  const {
    revenue_program_is_nonprofit: isNonprofit,
    styles,
    allow_offer_nyt_comp: allowOfferNytComp,
    elements: dynamicElements
  } = page;

  const currencySymbol = page?.currency?.symbol;
  const frequencyOptions = page?.elements?.find(({ type }) => type === 'DFrequency')?.content || [];
  const amountConfig = page?.elements?.find(({ type }) => type === 'DAmount')?.content || {};
  const { allowOther: allowUserSetValue, options: amountOptions } = amountConfig;
  const { askPhone } = page?.elements?.find(({ type }) => type === 'DDonorInfo')?.content || {};
  const reasonConfig = page?.elements?.find(({ type }) => type === 'DReason')?.content || {};
  const { reasons: reasonOptions, askReason, askHonoree, askInMemoryOf } = reasonConfig;
  const swagOptions = page?.elements?.find(({ type }) => type === 'DSwag')?.content || {};
  const { optOutDefault, swagThreshold, swags } = { swagOptions };
  const paymentConfig = page?.elements?.find(({ type }) => type === 'DPayment')?.content || {};
  const { offerPayFees, stripe: wallets } = paymentConfig;

  return {
    allowOfferNytComp,
    allowUserSetValue,
    amountOptions,
    askHonoree,
    askInMemoryOf,
    askPhone,
    askReason,
    currencySymbol,
    dynamicElements,
    frequencyOptions,
    isNonprofit,
    offerPayFees,
    optOutDefault,
    reasonOptions,
    styles,
    swags,
    swagThreshold,
    wallets
  };
};

export default function LivePage() {
  const { setAnalyticsConfig, analyticsInstance } = useAnalyticsContext();

  const subdomain = useSubdomain();
  const { pageSlug } = useParams();
  const [display404, setDisplay404] = useState(false);

  // const {
  //   isSuccess: pageQuerySuccess,
  //   data: {
  //     revenueProgram: { orgGaV3Id, orgGaV3Domain, orgGaV4Id, orgFbPixelId },
  //     ...page
  //   },
  //   isLoading: pageIsLoading
  // } = useQuery(['page'], () => fetchLivePageData(subdomain, pageSlug).catch((err) => setDisplay404(true)));

  const {
    isSuccess: pageQuerySuccess,
    data: page,
    isLoading: pageIsLoading
  } = useQuery(['page'], () => fetchLivePageData(subdomain, pageSlug));

  // generate initial payment intent. we need to have a payment intent in order to get a stripe client secret,
  // which in turn allows us to display the Stripe PaymentElement.
  //
  // note that this is an initial "dummy" payment intent for minimimum amount. We update the amount
  // when confirming payment after user submits form.

  const { clientSecret: stripeClientSecret, isLoading: paymentIntentLoading } = useQuery(['paymentIntent'], () =>
    fetchPaymentIntent(DEFAULT_PAYMENT_INTENT_AMOUNT).catch((err) => {
      debugger;
      setDisplay404(true);
    })
  );

  // load analytics once query for page data has successfully returned
  // useEffect(() => {
  //   if (pageQuerySuccess) {
  //     setAnalyticsConfig({ hubGaV3Id: HUB_GA_V3_ID, orgGaV3Id, orgGaV3Domain, orgGaV4Id, orgFbPixelId });
  //   }
  // }, [orgGaV3Id, orgGaV3Domain, orgGaV4Id, orgFbPixelId, setAnalyticsConfig, pageQuerySuccess]);

  useWebFonts(page?.styles?.font, { context: document.querySelector(STRIPE_IFRAME_SELECTOR) });

  // const isLoading = paymentIntentLoading || pageIsLoading || !analyticsInstance;

  const isLoading = paymentIntentLoading || pageIsLoading;

  return (
    <SegregatedStyles page={page}>
      {display404 ? (
        <LivePage404 />
      ) : isLoading ? (
        <LiveLoading />
      ) : (
        <DonationPage
          page={getDataFromPage(page)}
          liveView={true}
          // stripeClientSecret={stripeClientSecret}
          stripePromise={stripePromise}
        />
      )}
    </SegregatedStyles>
  );
}
