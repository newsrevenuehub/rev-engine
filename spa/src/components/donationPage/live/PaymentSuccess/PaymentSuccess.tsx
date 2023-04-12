import { useEffect, useMemo, useState } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import urlJoin from 'url-join';
import { useQuery } from '@tanstack/react-query';
import axios from 'ajax/axios';
import { LIVE_PAGE_DETAIL } from 'ajax/endpoints';
import { useAnalyticsContext } from 'components/analytics/AnalyticsContext';
import { THANK_YOU_SLUG } from 'routes';
import { HUB_GA_V3_ID } from 'appSettings';
import GlobalLoading from 'elements/GlobalLoading';
import { ContributionPage } from 'hooks/useContributionPage';

async function fetchPage(rpSlug: string, pageSlug: string): Promise<ContributionPage> {
  try {
    const { data } = await axios.get(LIVE_PAGE_DETAIL, { params: { revenue_program: rpSlug, page: pageSlug } });

    return data;
  } catch (error) {
    // Log it for Sentry and rethrow, which should cause the generic error
    // message to appear.

    console.warn(error);
    throw error;
  }
}

// This is an interstitial page we use solely to call `trackConversion` from our
// analytics. We use `stripe.confirmPayment` & `stripe.confirmSetup` in our
// contribution page form, which requires providing a return URL, which Stripe
// will send the user to after the payment is processed. Some orgs configure
// their page to go to a "custom", off-site thank you page. In that case, we
// would not be able to track a conversion, so we tell Stripe to go to this
// interstitial PaymentSuccess page before forwarding them on to either the
// default or custom thank you page.

export default function PaymentSuccess() {
  const history = useHistory();
  const { search } = useLocation();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const rpSlug = params.get('rpSlug');
  const pageSlug = params.get('pageSlug');

  // Retrieve the page if we have the relevant slugs.

  const { data: page, isSuccess: pageFetchSuccess } = useQuery(['getPage'], () => fetchPage(rpSlug!, pageSlug!), {
    enabled: !!rpSlug && !!pageSlug
  });

  const { trackConversion, analyticsInstance, setAnalyticsConfig } = useAnalyticsContext();
  const [inited, setInited] = useState(false);

  // These have to be effects because we're changing the state of a parent
  // component (AnalyticsContectProvider).

  useEffect(() => {
    // Configure analytics. We need to set the instance because it won't be loaded
    // for us, because the user will be sent here by Stripe, not the SPA.

    if (page && pageFetchSuccess && !analyticsInstance) {
      const coerceNullToUndefined = (value: string | null) => (value === null ? undefined : value);

      // Coerce null values to undefined.

      setAnalyticsConfig({
        hubGaV3Id: HUB_GA_V3_ID,
        orgFbPixelId: coerceNullToUndefined(page.revenue_program.facebook_pixel_id),
        orgGaV3Domain: coerceNullToUndefined(page.revenue_program.google_analytics_v3_domain),
        orgGaV3Id: coerceNullToUndefined(page.revenue_program.google_analytics_v3_id),
        orgGaV4Id: coerceNullToUndefined(page.revenue_program.google_analytics_v4_id)
      });
    }
  }, [analyticsInstance, page, pageFetchSuccess, setAnalyticsConfig]);

  useEffect(() => {
    // Once analytics have loaded, track a conversion and direct the user to the
    // configured thank you page.

    if (analyticsInstance && !inited && page) {
      setInited(true);
      analyticsInstance.on('ready', () => {
        const amount = params.get('amount') ?? '';
        const frequency = params.get('frequency') ?? '';

        // Track the conversion. We do *not* attempt to parse it as a number
        // here to maintain compatibility with existing code.

        trackConversion(amount);

        const next = params.get('next');

        if (next) {
          // We're redirecting off-site to org-supplied thank you page.

          const nextUrl = new URL(next);

          nextUrl.searchParams.append('uid', params.get('uid') ?? '');
          nextUrl.searchParams.append('frequency', frequency ?? '');
          nextUrl.searchParams.append('amount', amount);
          window.location.href = nextUrl.toString();
        } else {
          // We're going to the on-site generic thank you page. We need to
          // construct this URL because we're currently on `/payment/success`.

          const donationPageUrl = `${window.location.origin}/${page.slug}/`;

          history.push({
            pathname: urlJoin('/', params.get('fromPath') ?? '', THANK_YOU_SLUG),
            state: { amount, donationPageUrl, page, email: params.get('email'), frequencyText: frequency }
          });
        }
      });
    }
  }, [analyticsInstance, history, inited, page, params, trackConversion]);

  return <GlobalLoading />;
}
