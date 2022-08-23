import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { useQuery } from '@tanstack/react-query';
import PropTypes from 'prop-types';
import * as Sentry from '@sentry/react';

import { HUB_GA_V3_ID, HUB_STRIPE_API_PUB_KEY } from 'settings';
import { LIVE_PAGE_DETAIL, STRIPE_INITIAL_PAYMENT_INTENT } from 'ajax/endpoints';

import * as dynamicLayoutElements from 'components/donationPage/dynamicElements';

import axios from 'ajax/axios';
import useWebFonts from 'hooks/useWebFonts';
import useSubdomain from 'hooks/useSubdomain';
import useQueryString from 'hooks/useQueryString';

import { useAnalyticsContext } from 'components/analytics/AnalyticsContext';
import SegregatedStyles from 'components/donationPage/elements/SegregatedStyles';
import LiveLoading from 'components/donationPage/elements/loading/LiveLoading';
import LivePage404 from 'components/common/LivePage404';
import DonationPage from 'components/donationPage/DonationPage';
import LiveErrorFallback from './elements/errorFallback/LiveErrorFallback';

const STRIPE_IFRAME_SELECTOR = "iframe[title='Secure card payment input frame']";

const stripePromise = loadStripe(HUB_STRIPE_API_PUB_KEY);

async function fetchLivePageData(rpSlug, pageSlug) {
  return await axios({
    method: 'get',
    url: LIVE_PAGE_DETAIL,
    params: { revenue_program: rpSlug, page: pageSlug }
  }).then((response) => response.data);
}

// get dummy payment intent
async function fetchInitialPaymentIntent(rpSlug) {
  return await axios({
    method: 'post',
    url: STRIPE_INITIAL_PAYMENT_INTENT,
    data: { revenue_program: rpSlug }
  }).then((response) => response?.data?.clientSecret);
}

// convenience function used to extract data from page data from API
// to configure fields in donation form.
const getDataFromPage = (page) => {
  const {
    revenue_program_is_nonprofit: isNonprofit,
    styles,
    allow_offer_nyt_comp: allowOfferNytComp,
    elements: dynamicElements,
    revenue_program: { name: rpName }
  } = page;

  const currencySymbol = page?.currency?.symbol;
  const frequencyOptions = page?.elements?.find(({ type }) => type === 'DFrequency')?.content || [];
  const amountConfig = page?.elements?.find(({ type }) => type === 'DAmount')?.content || {};
  const { allowOther: allowUserSetValue, options: amountOptions } = amountConfig;
  const { askPhone } = page?.elements?.find(({ type }) => type === 'DDonorInfo')?.content || {};
  const reasonConfig = page?.elements?.find(({ type }) => type === 'DReason')?.content || {};
  const { reasons: reasonOptions, askReason, askHonoree, askInMemoryOf } = reasonConfig;
  const swagOptions = page?.elements?.find(({ type }) => type === 'DSwag')?.content || {};
  const richTextContent = page?.elements.find(({ type }) => type === 'DRichText')?.content || '';

  const { optOutDefault, swagThreshold, swags } = swagOptions;
  const paymentConfig = page?.elements?.find(({ type }) => type === 'DPayment')?.content || {};
  const { offerPayFees } = paymentConfig;

  return {
    allowOfferNytComp,
    allowUserSetValue,
    amountOptions,
    askHonoree,
    askInMemoryOf,
    askPhone,
    askReason,
    currencySymbol,
    dynamicElements: dynamicElements
      .filter((elem) => elem.type !== 'DPayment')
      .map((elem) => dynamicLayoutElements[elem.type]),
    frequencyOptions,
    isNonprofit,
    offerPayFees,
    optOutDefault,
    reasonOptions,
    styles,
    swags,
    swagThreshold,
    rpName,
    headerLogo: page?.header_logo,
    headerLink: page?.header_link,
    headerBgImage: page?.header_bg_image,
    heading: page?.heading,
    sideBarElements: page?.sidebar_elements,
    richTextContent
  };
};

function LivePage({ editorView }) {
  const { setAnalyticsConfig } = useAnalyticsContext();

  const subdomain = useSubdomain();
  const { pageSlug, revProgramSlug } = useParams();
  const [display404, setDisplay404] = useState(false);

  // get an `amount` query parameter from the URL, which can be used for default amount
  // in form
  const amountQueryParam = useQueryString('amount');
  const defaultAmount = !isNaN(parseFloat(amountQueryParam)) ? parseFloat(amountQueryParam) : undefined;

  const rpSlug = editorView ? revProgramSlug : subdomain;

  // retrieve page data from the API
  const { isSuccess: pageQuerySuccess, data: page } = useQuery(
    ['page'],
    () =>
      fetchLivePageData(rpSlug, pageSlug).catch((err) => {
        setDisplay404(true);
      }),
    { refetchOnWindowFocus: false }
  );

  // create an initial payment intent. Note that we intentionally do not catch here.
  // if errors encountered here, we rely on the error fallback.
  const { data: stripeClientSecret, isSuccess: paymentIntentSuccess } = useQuery(
    ['paymentIntent'],
    () => fetchInitialPaymentIntent(rpSlug),
    { refetchOnWindowFocus: false, enabled: !editorView }
  );

  // load analytics once query for page data has successfully returned. but if this is being loaded
  // in editor, then we don't want setAnalytics config to run, cause that will have happened further
  // up tree.
  useEffect(() => {
    if (pageQuerySuccess && !editorView) {
      setAnalyticsConfig({
        hubGaV3Id: HUB_GA_V3_ID,
        orgGaV3Id: page?.revenue_program?.google_analytics_v3_id,
        orgGaV3Domain: page?.revenue_program?.google_analytics_v3_domain,
        orgGaV4Id: page?.revenue_program?.google_analytics_v4_id,
        orgFbPixelId: page?.revenue_program?.facebook_pixel_id
      });
    }
  }, [
    setAnalyticsConfig,
    pageQuerySuccess,
    page?.revenue_program?.google_analytics_v3_id,
    page?.revenue_program?.google_analytics_v3_domain,
    page?.revenue_program?.google_analytics_v4_id,
    page?.revenue_program?.facebook_pixel_id,
    editorView
  ]);

  useWebFonts(page?.styles?.font, { context: document.querySelector(STRIPE_IFRAME_SELECTOR) });

  const isLoading = (!editorView && !paymentIntentSuccess) || !pageQuerySuccess;

  return (
    <Sentry.ErrorBoundary fallback={<LiveErrorFallback />}>
      <SegregatedStyles page={page}>
        {display404 ? (
          <LivePage404 />
        ) : isLoading ? (
          <LiveLoading />
        ) : (
          <DonationPage
            defaultAmount={defaultAmount}
            pageData={getDataFromPage(page)}
            liveView={!editorView}
            // in context of page editor, this value will be undefined, so pass empty string here so type checking won't complain.
            stripeClientSecret={stripeClientSecret || ''}
            stripePromise={stripePromise}
          />
        )}
      </SegregatedStyles>
    </Sentry.ErrorBoundary>
  );
}

LivePage.propTypes = {
  editorView: PropTypes.bool.isRequired
};

LivePage.defaultProps = {
  editorView: false
};

export default LivePage;
