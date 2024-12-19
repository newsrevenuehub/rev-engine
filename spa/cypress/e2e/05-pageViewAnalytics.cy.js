import { DONATIONS_SLUG, EDITOR_ROUTE, SIGN_IN, CONTENT_SLUG, PORTAL } from 'routes';

import { VERIFY_TOKEN } from 'ajax/endpoints';

import livePageFixture from '../fixtures/pages/live-page-1.json';
import { LIVE_PAGE_DETAIL } from 'ajax/endpoints';
import { getEndpoint, getTestingDonationPageUrl, EXPECTED_RP_SLUG } from '../support/util';
import { HUB_GA_V3_ID } from 'appSettings';
import join from 'url-join';

import hubAdminUser from '../fixtures/user/login-success-hub-admin';

const REVENUE_PROGRAM = EXPECTED_RP_SLUG;
const PAGE_NAME = 'mypage/';

const EDITOR_ROUTE_PAGE = join([EDITOR_ROUTE, REVENUE_PROGRAM, PAGE_NAME, '/']);

const HUB_TRACKED_PAGES_REQUIRING_NO_LOGIN = [SIGN_IN, PORTAL.ENTRY, PORTAL.VERIFY];

const HUB_TRACKED_PAGES_REQUIRING_HUB_LOGIN = [DONATIONS_SLUG, CONTENT_SLUG, EDITOR_ROUTE_PAGE];

// NB: The THANK_YOU_SLUG page is also tracked by both hub and org
// but at the moment there is not a convenient way to test thank you page
// for org analytics, because it depends on being sent there from successful
// donation on donation page, and in turn, that is tied to things going right
// with the Stripe API, which doesn't happen by default (long story, that one...)
describe('Pages that are only tracked by Hub', () => {
  beforeEach(() => {
    const gaV3CollectUrl = new URL('https://www.google-analytics.com/j/collect');
    cy.intercept(
      {
        hostname: gaV3CollectUrl.hostname,
        pathname: gaV3CollectUrl.pathname,
        method: 'POST',
        query: {
          t: 'pageview',
          tid: HUB_GA_V3_ID
        }
      },
      { statusCode: 200, body: {} }
    ).as('trackPageViewOnHubGaV3');
  });

  for (const page of HUB_TRACKED_PAGES_REQUIRING_NO_LOGIN) {
    it(`should track a page view for ${page}`, () => {
      cy.visit(page);
      cy.wait('@trackPageViewOnHubGaV3').then((interception) => {
        const queryParams = new URLSearchParams(interception.request.url.split('?')[1]);
        const trackedUrl = new URL(queryParams.get('dl'));
        expect(trackedUrl.pathname).to.equal(page);
      });
    });
  }

  for (const page of HUB_TRACKED_PAGES_REQUIRING_HUB_LOGIN) {
    it(`should track a page view for ${page}`, () => {
      cy.forceLogin(hubAdminUser);
      cy.visit(page);
      cy.wait('@trackPageViewOnHubGaV3').then((interception) => {
        const queryParams = new URLSearchParams(interception.request.url.split('?')[1]);
        const trackedUrl = new URL(queryParams.get('dl'));
        cy.wrap(trackedUrl.pathname).should('equal', page);
      });
    });
  }
});

describe('Pages that are tracked by both the hub and the org', () => {
  beforeEach(() => {
    // Google Analytics V3
    const gaV3CollectUrl = new URL('https://www.google-analytics.com/j/collect');

    cy.intercept(
      {
        hostname: gaV3CollectUrl.hostname,
        pathname: gaV3CollectUrl.pathname,
        query: {
          t: 'pageview',
          tid: HUB_GA_V3_ID
        }
      },
      { statusCode: 200, body: {} }
    ).as('trackPageViewOnHubGaV3');

    cy.intercept(
      {
        hostname: gaV3CollectUrl.hostname,
        pathname: gaV3CollectUrl.pathname,
        query: {
          t: 'pageview',
          tid: livePageFixture.revenue_program.google_analytics_v3_id
        }
      },
      { statusCode: 200, body: {} }
    ).as('trackPageViewOnOrgGaV3');

    // Google Analytics v4
    const gaV4CollectUrl = new URL('https://www.google-analytics.com/g/collect');
    cy.intercept(
      {
        hostname: gaV4CollectUrl.hostname,
        pathname: gaV4CollectUrl.pathname,
        query: { v: '2', en: 'page_view', tid: livePageFixture.revenue_program.google_analytics_v4_id }
      },
      { statusCode: 200, body: {} }
    ).as('trackPageViewOnOrgGaV4');
    cy.intercept('/api/v1/organizations/stripe_account_id/**', { fixture: 'stripe/org-account-id.json' });

    // Facebook Pixel
    const fbPixelCollectUrl = new URL('https://www.facebook.com/tr/');
    cy.intercept(
      {
        hostname: fbPixelCollectUrl.hostname,
        pathname: fbPixelCollectUrl.pathname,
        query: {
          ev: 'PageView'
        }
      },
      { statusCode: 200, body: {} }
    ).as('trackPageViewOnOrgFbPixel');
  });

  it('should track a page view for Donation Pages on Hub GAv3 and enabled Org analytics plugins', () => {
    cy.intercept(
      { method: 'GET', pathname: getEndpoint(LIVE_PAGE_DETAIL) },
      { body: livePageFixture, statusCode: 200 }
    ).as('getPageDetail');
    // cy.visit(page);
    const expectedPath = '/' + PAGE_NAME;
    cy.visit(getTestingDonationPageUrl(PAGE_NAME));
    cy.wait('@getPageDetail');
    cy.wait('@trackPageViewOnHubGaV3').then((interception) => {
      const queryParams = new URLSearchParams(interception.request.url.split('?')[1]);
      const trackedUrl = new URL(queryParams.get('dl'));
      cy.wrap(trackedUrl.pathname).should('equal', expectedPath);
    });
    cy.wait('@trackPageViewOnOrgGaV3').then((interception) => {
      const queryParams = new URLSearchParams(interception.request.url.split('?')[1]);
      const trackedUrl = new URL(queryParams.get('dl'));
      cy.wrap(trackedUrl.pathname).should('equal', expectedPath);
    });
    cy.wait('@trackPageViewOnOrgGaV4').then((interception) => {
      const queryParams = new URLSearchParams(interception.request.url.split('?')[1]);
      const trackedUrl = new URL(queryParams.get('dl'));
      cy.wrap(trackedUrl.pathname).should('equal', expectedPath);
    });
    cy.wait('@trackPageViewOnOrgFbPixel').then((interception) => {
      const queryParams = new URLSearchParams(interception.request.url.split('?')[1]);
      const trackedUrl = new URL(queryParams.get('dl'));
      cy.wrap(trackedUrl.pathname).should('equal', expectedPath);
    });
  });
});
