import { lazy } from 'react';
import join from 'url-join';

// Router
import * as ROUTES from 'routes';

// Analytics
import TrackPageView from 'components/analytics/TrackPageView';

// Utilities
import { SentryRoute } from 'hooks/useSentry';
import componentLoader from 'utilities/componentLoader';
import RouterSetup from './routes/RouterSetup';

/**
 * Split Bundles
 */
const GenericThankYou = lazy(() => componentLoader(() => import('components/donationPage/live/GenericThankYou')));
const LiveDonationPageContainer = lazy(() =>
  componentLoader(() => import(`components/donationPage/LiveDonationPageContainer`))
);

// TODO: [DEV-2374] Determine if this `componentLoader` function can be removed
const PaymentSuccess = lazy(() => componentLoader(() => import('components/donationPage/live/PaymentSuccess')));

function DonationPageRouter() {
  return (
    <RouterSetup>
      <SentryRoute
        path={[join(ROUTES.DONATION_PAGE_SLUG, ROUTES.THANK_YOU_SLUG), ROUTES.THANK_YOU_SLUG]}
        render={() => <TrackPageView component={GenericThankYou} />}
      />
      <SentryRoute path={ROUTES.PAYMENT_SUCCESS} render={() => <PaymentSuccess />} />
      <SentryRoute
        path={[ROUTES.DONATION_PAGE_SLUG, '/']}
        render={() => <TrackPageView component={LiveDonationPageContainer} />}
      />
    </RouterSetup>
  );
}

export default DonationPageRouter;
