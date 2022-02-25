import React, { lazy } from 'react';

// Router
import { Route, Switch } from 'react-router-dom';
import * as ROUTES from 'routes';

// Analytics
import TrackPageView from 'components/analytics/TrackPageView';

// Utilities
import componentLoader from 'utilities/componentLoader';

const GenericThankYou = lazy(() =>
  componentLoader(() => import(`components/donationPage/live/thankYou/GenericThankYou`))
);
const LiveDonationPageContainer = lazy(() =>
  componentLoader(() => import(`components/donationPage/LiveDonationPageContainer`))
);

function DonationPageRouter() {
  return (
    <Switch>
      <Route
        path={ROUTES.DONATION_PAGE_SLUG + ROUTES.THANK_YOU_SLUG}
        render={() => <TrackPageView component={GenericThankYou} />}
      />
      <Route path={ROUTES.THANK_YOU_SLUG} render={() => <TrackPageView component={GenericThankYou} />} />
      <Route path={ROUTES.DONATION_PAGE_SLUG} render={() => <TrackPageView component={LiveDonationPageContainer} />} />
      <Route path={'/'} render={() => <TrackPageView component={LiveDonationPageContainer} />} />
    </Switch>
  );
}

export default DonationPageRouter;
