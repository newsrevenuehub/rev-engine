import React, { useEffect } from 'react';
import { mount } from '@cypress/react';
import { useAnalyticsContext, AnalyticsContextWrapper } from './AnalyticsContext';

const FB_PIXEL_ID = 'myFbPixelId';
const DONATION_AMOUNT = 22.0;
const FB_TRACK_URL = new URL('https://www.facebook.com/tr/');

const MyComponent = () => {
  const { setAnalyticsConfig, trackConversion } = useAnalyticsContext();

  useEffect(() => {
    setAnalyticsConfig(null, null, null, null, FB_PIXEL_ID);
    trackConversion(DONATION_AMOUNT);
  });
  return <></>;
};

const App = () => {
  return (
    <AnalyticsContextWrapper>
      <MyComponent />
    </AnalyticsContextWrapper>
  );
};

describe('OrgAndHubTrackedPage.trackDonation', () => {
  it('sends a donation and purchase event to Facebook Pixel when org has FB pixel id', () => {
    cy.intercept({
      hostname: FB_TRACK_URL.hostname,
      pathname: FB_TRACK_URL.pathname,
      query: {
        id: FB_PIXEL_ID,
        ev: 'Donation'
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
    const app = mount(<App />);

    cy.wait(['@fbTrackDonation', '@fbTrackPurchase']);
  });
});
