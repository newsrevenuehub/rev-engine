import { useEffect } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import queryString from 'query-string';
import urlJoin from 'url-join';
import { useQuery } from '@tanstack/react-query';

import axios from 'ajax/axios';
import { LIVE_PAGE_DETAIL } from 'ajax/endpoints';
import { useAnalyticsContext } from 'components/analytics/AnalyticsContext';
import { THANK_YOU_SLUG } from 'routes';
import { HUB_GA_V3_ID } from 'settings';

function fetchPage(rpSlug, pageSlug) {
  return axios.get(LIVE_PAGE_DETAIL, { params: { revenue_program: rpSlug, page: pageSlug } }).then(({ data }) => data);
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
  const { amount, next, frequency, uid, email, pageSlug, rpSlug, fromPath } = queryString.parse(search);

  const { data: page, isSuccess: pageFetchSuccess } = useQuery(['getPage'], () => fetchPage(rpSlug, pageSlug));

  // we'll need to actually setAnalytics instance because won't already
  const { trackConversion, analyticsInstance, setAnalyticsConfig } = useAnalyticsContext();

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

  // if there's an analytics instance, we call trackConversion.
  // then either way, we push to the `next` URL from query param if there
  // is one, otherwise, we go to the default thank you page.
  useEffect(() => {
    if (analyticsInstance) {
      trackConversion(amount);
      // if we're directing off-site to org-supplied thank you page...
      if (next) {
        const nextUrl = new URL(next);
        nextUrl.searchParams.append('uid', uid);
        nextUrl.searchParams.append('frequency', frequency);
        nextUrl.searchParams.append('amount', amount);
        window.location = nextUrl;
        history.push(nextUrl);
        // ... otherwise if we're going to on-site generic thank you page
      } else {
        const donationPageUrl = window.location.href;
        history.push({
          pathname: urlJoin(fromPath, THANK_YOU_SLUG),
          state: { frequency, amount, email, donationPageUrl, page }
        });
      }
    }
  });
  return <></>;
}
