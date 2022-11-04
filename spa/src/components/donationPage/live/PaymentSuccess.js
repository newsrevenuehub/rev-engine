import { useEffect, useState } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import queryString from 'query-string';
import urlJoin from 'url-join';
import { useQuery, useMutation } from '@tanstack/react-query';

import axios from 'ajax/axios';
import { LIVE_PAGE_DETAIL, getPaymentSuccessEndpoint } from 'ajax/endpoints';
import { useAnalyticsContext } from 'components/analytics/AnalyticsContext';
import { THANK_YOU_SLUG } from 'routes';
import { HUB_GA_V3_ID } from 'appSettings';
import GlobalLoading from 'elements/GlobalLoading';

function fetchPage(rpSlug, pageSlug) {
  return axios.get(LIVE_PAGE_DETAIL, { params: { revenue_program: rpSlug, page: pageSlug } }).then(({ data }) => data);
}

function patchPaymentSuccess(providerClientSecretId) {
  return axios.patch(getPaymentSuccessEndpoint(providerClientSecretId));
}

// This is an interstitial page we use solely to call `trackConversion` from
// our analytics. We use `stripe.confirmPayment` in our donation page form, which
// requires providing a return URL, which Stripe will send the user to after the
// payment is processed. Some org's configure their page to go to a "custom", off-site
// thank you page. In that case, we would not be able to track a conversion, so
// we tell stripe to go to this interstitial PaymentSuccess page before forwarding
// them on to either the default or custom thank you page.
export default function PaymentSuccess() {
  const history = useHistory();
  const { search } = useLocation();
  const { amount, next, frequency, uid, email, pageSlug, rpSlug, fromPath, contributionUuid } =
    queryString.parse(search);

  const { data: page, isSuccess: pageFetchSuccess } = useQuery(['getPage'], () => fetchPage(rpSlug, pageSlug));

  // we'll need to actually setAnalytics instance because won't already be loaded, since user gets here
  // via supra SPA-level redirection from stripe.confirmPayment
  const { trackConversion, analyticsInstance, setAnalyticsConfig } = useAnalyticsContext();

  // we need to gaurantee that analytics has loaded before trying to fire the trackConversion event.
  // If we don't do this, it's possible that page redirection will already have happened before analytics gets
  // a chance to fire.
  const [analyticsReady, setAnalyticsReady] = useState(false);

  useEffect(() => {
    if (analyticsInstance) {
      analyticsInstance.on('ready', () => setAnalyticsReady(true));
    }
  }, [analyticsInstance]);

  const { mutate: signalPaymentSuccess, isLoading: signalPaymentSuccessIsLoading } = useMutation((contributionUuid) => {
    return patchPaymentSuccess(contributionUuid);
  });

  const [conversionTracked, setConversionTracked] = useState(false);

  useEffect(() => {
    if (contributionUuid) signalPaymentSuccess(contributionUuid);
  }, [signalPaymentSuccess, contributionUuid]);

  // after page is retrieved, we can load analytics instance, which has side effect of
  // tracking a page view
  useEffect(() => {
    if (pageFetchSuccess && !analyticsInstance) {
      setAnalyticsConfig({
        hubGaV3Id: HUB_GA_V3_ID,
        orgGaV3Id: page?.revenue_program?.google_analytics_v3_id,
        orgGaV3Domain: page?.revenue_program?.google_analytics_v3_domain,
        orgGaV4Id: page?.revenue_program?.google_analytics_v4_id,
        orgFbPixelId: page?.revenue_program?.facebook_pixel_id
      });
    }
  }, [
    pageFetchSuccess,
    setAnalyticsConfig,
    analyticsInstance,
    page?.revenue_program?.google_analytics_v3_id,
    page?.revenue_program?.google_analytics_v3_domain,
    page?.revenue_program?.google_analytics_v4_id,
    page?.revenue_program?.facebook_pixel_id
  ]);

  useEffect(() => {
    if (analyticsReady) {
      trackConversion(amount);
      setConversionTracked(true);
    }
  }, [amount, analyticsInstance, analyticsReady, page, trackConversion]);

  useEffect(() => {
    if (conversionTracked && !signalPaymentSuccessIsLoading) {
      // if we're directing off-site to org-supplied thank you page...
      if (next) {
        const nextUrl = new URL(next);
        nextUrl.searchParams.append('uid', uid);
        nextUrl.searchParams.append('frequency', frequency);
        nextUrl.searchParams.append('amount', amount);
        window.location = nextUrl;
        // ... otherwise if we're going to on-site generic thank you page
      } else {
        const donationPageUrl = window.location.href;
        history.push({
          pathname: urlJoin('/', fromPath, THANK_YOU_SLUG),
          state: { frequency, amount, email, donationPageUrl, page }
        });
      }
    }
  }, [
    amount,
    analyticsInstance,
    conversionTracked,
    email,
    frequency,
    fromPath,
    history,
    next,
    page,
    signalPaymentSuccessIsLoading,
    trackConversion,
    uid
  ]);

  return <GlobalLoading />;
}
