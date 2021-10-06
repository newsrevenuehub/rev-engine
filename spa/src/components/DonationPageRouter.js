import React from 'react';

// Router
import { Route, BrowserRouter, Switch } from 'react-router-dom';
import * as ROUTES from 'routes';

// Analytics
import TrackPageView from 'components/analytics/TrackPageView';

// Elements
import GlobalLoading from 'elements/GlobalLoading';

/**
 * Split Bundles
 */
const GenericThankYou = React.lazy(() => import('components/donationPage/live/thankYou/GenericThankYou'));
const LiveDonationPageContainer = React.lazy(() => import('components/donationPage/LiveDonationPageContainer'));

function DonationPageRouter() {
  return (
    <BrowserRouter>
      <React.Suspense fallback={<GlobalLoading />}>
        <Switch>
          <Route
            path={ROUTES.DONATION_PAGE_SLUG + ROUTES.THANK_YOU_SLUG}
            render={() => <TrackPageView component={GenericThankYou} />}
          />
          <Route path={ROUTES.THANK_YOU_SLUG} render={() => <TrackPageView component={GenericThankYou} />} />
          <Route
            path={ROUTES.DONATION_PAGE_SLUG}
            render={() => <TrackPageView component={LiveDonationPageContainer} />}
          />
          <Route path={'/'} render={() => <TrackPageView component={LiveDonationPageContainer} />} />
        </Switch>
      </React.Suspense>
    </BrowserRouter>
  );
}

export default DonationPageRouter;
