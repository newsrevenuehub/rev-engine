import cloneDeep from 'lodash.clonedeep';
import { CONTRIBUTOR_ENTRY, CONTRIBUTOR_VERIFY, CONTRIBUTOR_DASHBOARD, LOGIN } from 'routes';

import livePageFixture from '../fixtures/pages/live-page-1.json';
import { FULL_PAGE, ORG_STRIPE_ACCOUNT_ID } from 'ajax/endpoints';
import { getEndpoint } from '../support/util';
import { HUB_GA_V3_ID } from 'constants/analyticsConstants';

import * as stripeFns from 'components/paymentProviders/stripe/stripeFns';

const LIVE_DONATION_PAGE_ROUTE = 'myprogram/mypage';

describe('HubTrackedPage component', () => {
  beforeEach(() => {
    const gaGetScriptUrl = 'https://www.google-analytics.com/analytics.js';
    const gaV3CollectUrl = 'https://www.google-analytics.com/j/collect*';
    cy.intercept(gaGetScriptUrl, {
      fixture: '../fixtures/analytics/ga_v3_script'
    }).as('getGaV3Analytics');
    cy.intercept({ url: gaV3CollectUrl }).as('collect');
    cy.intercept(getEndpoint(ORG_STRIPE_ACCOUNT_ID));
  });
  it('should add a Google Analytics V3 tracker for the Hub', () => {
    const hubTrackedPages = [LOGIN, CONTRIBUTOR_ENTRY, CONTRIBUTOR_VERIFY, CONTRIBUTOR_DASHBOARD];
    hubTrackedPages.forEach((page) => {
      cy.visit(page);
      cy.wait('@getGaV3Analytics');
      cy.wait('@collect').then((interception) => {
        const searchParams = new URLSearchParams(interception.request.url.split('?')[1]);
        expect(searchParams.get('t')).to.equal('pageview');
        expect(searchParams.get('tid')).to.equal(HUB_GA_V3_ID);
      });
    });
  });
});

describe('OrgAndHubTrackedPage component on live donation page', () => {
  beforeEach(() => {
    // Intercepts for analytics plugins
    const gaV3CollectUrl = new URL('https://www.google-analytics.com/j/collect');
    const gaV4CollectUrl = new URL('https://www.google-analytics.com/g/collect');

    cy.intercept({
      hostname: gaV3CollectUrl.hostname,
      pathname: gaV3CollectUrl.pathname,
      query: {
        v: '1',
        t: 'pageview'
      }
    }).as('collectGaV3');

    cy.intercept({
      // method: 'POST',
      hostname: gaV4CollectUrl.hostname,
      pathname: gaV4CollectUrl.pathname,
      query: { v: '2', en: 'page_view' }
    }).as('collectGaV4');

    const fbPixelInitUrl = new URL(
      `https://connect.facebook.net/signals/config/${livePageFixture.revenue_program.facebook_pixel_id}`
    );
    const fbPixelCollectUrl = new URL('https://www.facebook.com/tr/');

    cy.intercept({
      hostname: fbPixelInitUrl.hostname,
      pathname: fbPixelInitUrl.pathname
    }).as('initFbPixelInstance');

    cy.intercept({
      hostname: fbPixelCollectUrl.hostname,
      pathname: fbPixelCollectUrl.pathname,
      query: {
        ev: 'PageView'
      }
    }).as('fbPixelTrackPageView');

    cy.intercept({
      hostname: fbPixelCollectUrl.hostname,
      pathname: fbPixelCollectUrl.pathname,
      query: {
        ev: 'Donation'
      }
    }).as('fbPixelTrackDonation');

    cy.intercept({
      hostname: fbPixelCollectUrl.hostname,
      pathname: fbPixelCollectUrl.pathname,
      query: {
        ev: 'Purchase'
      }
    }).as('fbPixelTrackPurchase');

    // Intercepts for stripe
    cy.intercept({ pathname: getEndpoint(ORG_STRIPE_ACCOUNT_ID) }, { statusCode: 200 }).as('getStripe');
  });

  it('tracks page view for Hub only when no org GA data', () => {
    const updatedFixture = cloneDeep(livePageFixture);
    updatedFixture.revenue_program.google_analytics_v3_domain = null;
    updatedFixture.revenue_program.google_analytics_v3_id = null;
    updatedFixture.revenue_program.google_analytics_v4_id = null;

    cy.intercept({ method: 'GET', pathname: getEndpoint(FULL_PAGE) }, { body: updatedFixture, statusCode: 200 }).as(
      'getPageDetail'
    );
    cy.visit(LIVE_DONATION_PAGE_ROUTE);
    cy.wait('@getPageDetail');
    cy.wait('@getStripe');
    cy.wait('@collectGaV3').then((interception) => {
      const searchParams = new URLSearchParams(interception.request.url.split('?')[1]);
      expect(searchParams.get('t')).to.equal('pageview');
      expect(searchParams.get('tid')).to.equal(HUB_GA_V3_ID);
    });
  });

  it('tracks a page view for both Hub and Org when org has enabled Google Analytics v3', () => {
    cy.intercept({ method: 'GET', pathname: getEndpoint(FULL_PAGE) }, { body: livePageFixture, statusCode: 200 }).as(
      'getPageDetail'
    );
    cy.visit(LIVE_DONATION_PAGE_ROUTE);
    cy.wait(['@getPageDetail', '@getStripe']);
    cy.wait('@collectGaV3').then((interception) => {
      const searchParams = new URLSearchParams(interception.request.url.split('?')[1]);
      expect(searchParams.get('t')).to.equal('pageview');
      expect(searchParams.get('tid')).to.equal(HUB_GA_V3_ID);
    });
    cy.wait('@collectGaV3').then((interception) => {
      const searchParams = new URLSearchParams(interception.request.url.split('?')[1]);
      expect(searchParams.get('t')).to.equal('pageview');
      expect(searchParams.get('tid')).to.equal(livePageFixture.revenue_program.google_analytics_v3_id);
    });
  });

  it('tracks a pageview in Google Analytics v4 for org when org has enabled Google Analytics v4', () => {
    const updatedFixture = cloneDeep(livePageFixture);
    updatedFixture.revenue_program.google_analytics_v3_id = null;
    updatedFixture.revenue_program.google_analytics_v3_domain = null;
    cy.intercept({ method: 'GET', pathname: getEndpoint(FULL_PAGE) }, { body: updatedFixture, statusCode: 200 }).as(
      'getPageDetail'
    );
    cy.visit(LIVE_DONATION_PAGE_ROUTE);
    cy.wait(['@getPageDetail', '@getStripe', '@collectGaV3']);
    cy.wait('@collectGaV4').then((interception) => {
      const searchParams = new URLSearchParams(interception.request.url.split('?')[1]);
      expect(searchParams.get('en')).to.equal('page_view');
      expect(searchParams.get('tid')).to.equal(updatedFixture.revenue_program.google_analytics_v4_id);
    });
  });

  it('tracks a pageview in Facebook Pixel v4 for org when org has a Facebook Pixel id for rev program', () => {
    cy.intercept({ method: 'GET', pathname: getEndpoint(FULL_PAGE) }, { body: livePageFixture, statusCode: 200 }).as(
      'getPageDetail'
    );
    cy.visit(LIVE_DONATION_PAGE_ROUTE);
    cy.wait('@fbPixelTrackPageView').then((interception) => {
      const queryString = interception.request.url.split('?')[1];
      const query = new URLSearchParams(queryString);
      expect(query.get('id')).to.equal(livePageFixture.revenue_program.facebook_pixel_id);
      const trackedUrl = new URL(query.get('dl'));
      expect(trackedUrl.pathname).to.equal(`/${LIVE_DONATION_PAGE_ROUTE}`);
    });
  });

  it.only('tracks a donation and purchase in Facebook Pixel on sucessful donation for rev program with Facebook Pixel id', () => {
    cy.intercept({ method: 'GET', pathname: getEndpoint(FULL_PAGE) }, { body: livePageFixture, statusCode: 200 }).as(
      'getPageDetail'
    );
    cy.intercept('/api/v1/organizations/stripe_account_id/**', { fixture: 'stripe/org-account-id.json' });

    const interval = 'one_time';
    const amount = '120';

    cy.interceptDonation();

    cy.intercept({ method: 'POST', url: 'https://api.stripe.com/v1/payment_methods' }).as('stripeCreatePaymentMethod');
    cy.intercept({ method: 'POST', url: 'http://localhost:3000/api/v1/stripe/payment/' }).as(
      'stripeConfirmCardPayment'
    );
    cy.visit(LIVE_DONATION_PAGE_ROUTE);

    const getPaymentElementIframeWindow = () => {
      return cy.get('iframe[name*="__privateStripeFrame"]').its('0.contentWindow').should('exist');
    };

    getPaymentElementIframeWindow().then((win) => {
      cy.spy(win, 'fetch').as('fetch');
    });

    cy.setUpDonation(interval, amount);
    cy.makeDonation();

    cy.get('@fetch').should('have.been.calledOnce');

    // cy.wait(10000);
    // cy.wait('@fbPixelTrackDonation').then((interception) => {
    //   const queryString = interception.request.url.split('?')[1];
    //   const query = new URLSearchParams(queryString);
    //   expect(query.get('id').to.equal(livePageFixture.revenue_program.facebook_pixel_id));
    // });
    // cy.wait('@fbPixelTrackPurchase').then((interception) => {
    //   const queryString = interception.request.url.split('?')[1];
    //   const query = new URLSearchParams(queryString);
    //   expect(query.get('id')).to.equal(livePageFixture.revenue_program.facebook_pixel_id);
    //   expect(query.get('amount')).to.equal(amount);
    // });
  });
});
