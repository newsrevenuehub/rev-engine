import React, { useEffect } from 'react';
import { mount } from '@cypress/react';
import { AnalyticsContextWrapper, useAnalyticsContext } from './AnalyticsContext';
import { useConfigureAnalytics } from '.';
const FB_PIXEL_ID = '123456789';
const DONATION_AMOUNT = 22.0;
const FB_TRACK_URL = new URL('https://www.facebook.com/tr/');

const MyComponent = () => {
  const { trackConversion, analyticsInstance } = useAnalyticsContext();

  useConfigureAnalytics({ orgFbPixelId: FB_PIXEL_ID });

  useEffect(() => {
    if (analyticsInstance) {
      trackConversion(DONATION_AMOUNT);
    }
  }, [analyticsInstance]);

  return <></>;
};

const App = () => {
  return (
    <AnalyticsContextWrapper>
      <MyComponent />
    </AnalyticsContextWrapper>
  );
};

describe('trackConversion', () => {
  it('sends a donation and purchase event to Facebook Pixel when org has FB pixel id', () => {
    cy.intercept({
      hostname: FB_TRACK_URL.hostname,
      pathname: FB_TRACK_URL.pathname,
      query: {
        id: FB_PIXEL_ID,
        ev: 'Contribute'
      }
    }).as('fbTrackDonation');
    cy.intercept({
      query: {
        id: FB_PIXEL_ID,
        ev: 'Purchase',
        'cd[currency]': 'USD',
        'cd[value]': DONATION_AMOUNT
      }
    }).as('fbTrackPurchase');
    mount(<App />);
    cy.wait(['@fbTrackPurchase', '@fbTrackDonation']);
  });
});
