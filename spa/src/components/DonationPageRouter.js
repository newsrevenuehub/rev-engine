import React, { lazy } from 'react';

// Router
import { Route, BrowserRouter, Switch } from 'react-router-dom';
import * as ROUTES from 'routes';

// Analytics
import TrackPageView from 'components/analytics/TrackPageView';

// Elements
import GlobalLoading from 'elements/GlobalLoading';
import ChunkErrorBoundary from 'components/errors/ChunkErrorBoundary';

// Utilities
import componentLoader from 'utilities/componentLoader';
import AddSlashToRoutes from './routes/AddSlashToRoutes';

/**
 * Split Bundles
 */
const GenericThankYou = lazy(() =>
  componentLoader(() => import(`components/donationPage/live/thankYou/GenericThankYou`))
);
const LiveDonationPageContainer = lazy(() =>
  componentLoader(() => import(`components/donationPage/LiveDonationPageContainer`))
);

// TODO: [DEV-2374] Determine if this `componentLoader` function can be removed
const PaymentSuccess = lazy(() => componentLoader(() => import('components/donationPage/live/PaymentSuccess')));

function DonationPageRouter() {
  return (
    <BrowserRouter>
      <AddSlashToRoutes>
        <ChunkErrorBoundary>
          <React.Suspense fallback={<GlobalLoading />}>
            <Switch>
              <Route
                path={[ROUTES.DONATION_PAGE_SLUG + ROUTES.THANK_YOU_SLUG, ROUTES.THANK_YOU_SLUG]}
                render={() => <TrackPageView component={GenericThankYou} />}
              />
              <Route path={ROUTES.PAYMENT_SUCCESS} render={() => <PaymentSuccess />} />
              <Route
                path={[ROUTES.DONATION_PAGE_SLUG, '/']}
                render={() => <TrackPageView component={LiveDonationPageContainer} />}
              />
            </Switch>
          </React.Suspense>
        </ChunkErrorBoundary>
      </AddSlashToRoutes>
    </BrowserRouter>
  );
}

export default DonationPageRouter;
