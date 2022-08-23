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

/**
 * Split Bundles
 */
const GenericThankYou = lazy(() => componentLoader(() => import(`components/donationPage/thankYou`)));
const PublicPageWrapper = lazy(() => componentLoader(() => import(`components/donationPage/PublicPageWrapper`)));

function DonationPageRouter() {
  return (
    <BrowserRouter>
      <ChunkErrorBoundary>
        <React.Suspense fallback={<GlobalLoading />}>
          <Switch>
            <Route
              path={ROUTES.DONATION_PAGE_SLUG + ROUTES.THANK_YOU_SLUG}
              render={() => <TrackPageView component={GenericThankYou} />}
            />
            <Route path={ROUTES.THANK_YOU_SLUG} render={() => <TrackPageView component={GenericThankYou} />} />
            <Route path={ROUTES.DONATION_PAGE_SLUG} render={() => <TrackPageView component={PublicPageWrapper} />} />
            <Route path={'/'} render={() => <TrackPageView component={PublicPageWrapper} />} />
          </Switch>
        </React.Suspense>
      </ChunkErrorBoundary>
    </BrowserRouter>
  );
}

export default DonationPageRouter;
