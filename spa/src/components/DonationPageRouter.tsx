import { lazy } from 'react';
import join from 'url-join';

// Router
import { DONATION_PAGE_SLUG, PAYMENT_SUCCESS, THANK_YOU_SLUG } from 'routes';

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
const PublishedDonationPage = lazy(() =>
  componentLoader(() => import(`components/donationPage/PublishedDonationPage`))
);

// TODO: [DEV-2374] Determine if this `componentLoader` function can be removed
const PaymentSuccess = lazy(() => componentLoader(() => import('components/donationPage/live/PaymentSuccess')));
const ExtraneousURLRedirect = lazy(() =>
  componentLoader(() => import('components/donationPage/ExtraneousURLRedirect'))
);

function DonationPageRouter() {
  // Ordering of routes is important. The GenericThankYou and PaymentSuccess
  // routes need to take precedence over ExtraneousURLRedirect.

  return (
    <RouterSetup>
      <SentryRoute
        path={[join(DONATION_PAGE_SLUG, THANK_YOU_SLUG), THANK_YOU_SLUG]}
        render={() => (
          <TrackPageView>
            <GenericThankYou />
          </TrackPageView>
        )}
      />
      <SentryRoute path={PAYMENT_SUCCESS} render={() => <PaymentSuccess />} />
      <SentryRoute path="/*/*/*" render={() => <ExtraneousURLRedirect />} />
      <SentryRoute
        path={[DONATION_PAGE_SLUG, '/']}
        render={() => (
          <TrackPageView>
            <PublishedDonationPage />
          </TrackPageView>
        )}
      />
    </RouterSetup>
  );
}

export default DonationPageRouter;
