import cloneDeep from 'lodash.clonedeep';
import {
  CONTRIBUTOR_ENTRY,
  CONTRIBUTOR_VERIFY,
  CONTRIBUTOR_DASHBOARD,
  DONATIONS_SLUG,
  EDITOR_ROUTE,
  LOGIN,
  MAIN_CONTENT_SLUG,
  ORGANIZATION_SLUG,
  PAGES_SLUG
} from 'routes';

import { VERIFY_TOKEN } from 'ajax/endpoints';

import livePageFixture from '../fixtures/pages/live-page-1.json';
import { FULL_PAGE } from 'ajax/endpoints';
import { getEndpoint } from '../support/util';
import { HUB_GA_V3_ID } from 'constants/analyticsConstants';

const REVENUE_PROGRAM = 'myprogram';
const PAGE_NAME = 'mypage';

const DONATION_PAGE_VIA_REV_PROGRAM_PAGE = `/${REVENUE_PROGRAM}/${PAGE_NAME}`;
const DONATION_PAGE_VIA_REV_PROGRAM = `/${REVENUE_PROGRAM}`;

const EDITOR_ROUTE_REV = `${EDITOR_ROUTE}/${REVENUE_PROGRAM}`;
const EDITOR_ROUTE_PAGE = `${EDITOR_ROUTE}${DONATION_PAGE_VIA_REV_PROGRAM_PAGE}`;

const HUB_TRACKED_PAGES_REQURING_NO_LOGIN = [LOGIN];

const HUB_TRACKED_PAGES_REQUIRING_HUB_LOGIN = [
  MAIN_CONTENT_SLUG,
  ORGANIZATION_SLUG,
  DONATIONS_SLUG,
  PAGES_SLUG,
  EDITOR_ROUTE_REV,
  EDITOR_ROUTE_PAGE,
  CONTRIBUTOR_ENTRY,
  CONTRIBUTOR_VERIFY
];

// NB: The THANK_YOU_SLUG page is also tracked by both hub and org
// but at the moment there is not a convenient way to test thank you page
// for org analytics, because it depends on being sent there from successful
// donation on donation page, and in turn, that is tied to things going right
// with the Stripe API, which doesn't happen by default (long story, that one...)
const HUB_AND_ORG_TRACKED_PAGES = [DONATION_PAGE_VIA_REV_PROGRAM, DONATION_PAGE_VIA_REV_PROGRAM_PAGE];

describe.only('Pages that are only tracked by Hub', () => {
  beforeEach(() => {
    const gaV3CollectUrl = new URL('https://www.google-analytics.com/j/collect');
    cy.intercept({
      hostname: gaV3CollectUrl.hostname,
      pathname: gaV3CollectUrl.pathname,
      method: 'POST',
      query: {
        t: 'pageview',
        tid: HUB_GA_V3_ID
      }
    }).as('trackPageViewOnHubGaV3');
  });

  it('pages that require no login', () => {
    HUB_TRACKED_PAGES_REQURING_NO_LOGIN.forEach((page) => {
      cy.visit(page);
      cy.wait('@trackPageViewOnHubGaV3').then((interception) => {
        const queryParams = new URLSearchParams(interception.request.url.split('?')[1]);
        const trackedUrl = new URL(queryParams.get('dl'));
        expect(trackedUrl.pathname).to.equal(page);
      });
    });
  });

  it('pages that require hub login', () => {
    cy.login('user/stripe-verified.json');
    // logging in will create an initial page view, and we wait for same intercept below per page, so wait on
    // login triggered page view now.
    cy.wait('@trackPageViewOnHubGaV3');

    HUB_TRACKED_PAGES_REQUIRING_HUB_LOGIN.forEach((page) => {
      cy.visit(page);
      cy.wait('@trackPageViewOnHubGaV3').then((interception) => {
        const queryParams = new URLSearchParams(interception.request.url.split('?')[1]);
        const trackedUrl = new URL(queryParams.get('dl'));
        expect(trackedUrl.pathname).to.equal(page);
      });
    });
  });

  it('pages that require contributor login', () => {
    cy.login('user/valid-contributor-1.json');
    // logging in will create an initial page view, and we wait for same intercept below per page, so wait on
    // login triggered page view now.
    cy.wait('@trackPageViewOnHubGaV3');

    cy.intercept({ method: 'POST', url: getEndpoint(VERIFY_TOKEN) }, { fixture: 'user/valid-contributor-1.json' }).as(
      'login'
    );
    cy.interceptPaginatedDonations();
    cy.visit(CONTRIBUTOR_VERIFY);
    cy.url().should('contain', CONTRIBUTOR_DASHBOARD);
    cy.wait('@trackPageViewOnHubGaV3').then((interception) => {
      const queryParams = new URLSearchParams(interception.request.url.split('?')[1]);
      const trackedUrl = new URL(queryParams.get('dl'));
      expect(trackedUrl.pathname).to.equal(CONTRIBUTOR_DASHBOARD);
    });
  });
});

describe('Pages that are tracked by both the hub and the org', () => {
  before(() => {
    cy.login('user/stripe-verified.json');

    // Google Analytics V3
    const gaV3CollectUrl = new URL('https://www.google-analytics.com/j/collect');

    cy.intercept({
      hostname: gaV3CollectUrl.hostname,
      pathname: gaV3CollectUrl.pathname,
      query: {
        t: 'pageview',
        tid: HUB_GA_V3_ID
      }
    }).as('trackPageViewOnHubGaV3');

    cy.intercept({
      hostname: gaV3CollectUrl.hostname,
      pathname: gaV3CollectUrl.pathname,
      query: {
        t: 'pageview',
        tid: livePageFixture.revenue_program.google_analytics_v3_id
      }
    }).as('trackPageViewOnOrgGaV3');

    // Google Analytics v4
    const gaV4CollectUrl = new URL('https://www.google-analytics.com/g/collect');
    cy.intercept({
      hostname: gaV4CollectUrl.hostname,
      pathname: gaV4CollectUrl.pathname,
      query: { v: '2', en: 'page_view', tid: livePageFixture.revenue_program.google_analytics_v4_id }
    }).as('trackPageViewOnOrgGaV4');

    // Facebook Pixel
    const fbPixelCollectUrl = new URL('https://www.facebook.com/tr/');
    cy.intercept({
      hostname: fbPixelCollectUrl.hostname,
      pathname: fbPixelCollectUrl.pathname,
      query: {
        ev: 'PageView'
      }
    }).as('trackPageViewOnOrgFbPixel');
  });

  it('tracks page view for Hub only when no org GA data', () => {
    const updatedFixture = cloneDeep(livePageFixture);
    updatedFixture.revenue_program.google_analytics_v3_domain = null;
    updatedFixture.revenue_program.google_analytics_v3_id = null;
    updatedFixture.revenue_program.google_analytics_v4_id = null;
    cy.intercept({ method: 'GET', pathname: getEndpoint(FULL_PAGE) }, { body: updatedFixture, statusCode: 200 }).as(
      'getPageDetail'
    );
    HUB_AND_ORG_TRACKED_PAGES.forEach((page) => {
      cy.visit(page);
      cy.wait('@getPageDetail');
      cy.wait('@trackPageViewOnHubGaV3').then((interception) => {
        const queryParams = new URLSearchParams(interception.request.url.split('?')[1]);
        const trackedUrl = new URL(queryParams.get('dl'));
        expect(trackedUrl.pathname).to('equal', page);
      });
    });
  });
  it('tracks a page view for both Hub and Org when org has enabled Google Analytics v3', () => {
    cy.intercept({ method: 'GET', pathname: getEndpoint(FULL_PAGE) }, { body: livePageFixture, statusCode: 200 }).as(
      'getPageDetail'
    );
    HUB_AND_ORG_TRACKED_PAGES.forEach((page) => {
      cy.visit(page);
      cy.wait('@getPageDetail');
      cy.wait('@trackPageViewOnHubGaV3').then((interception) => {
        const queryParams = new URLSearchParams(interception.request.url.split('?')[1]);
        const trackedUrl = new URL(queryParams.get('dl'));
        expect(trackedUrl.pathname).to('equal', page);
      });
      cy.wait('@trackPageViewOnOrgGaV3').then((interception) => {
        const queryParams = new URLSearchParams(interception.request.url.split('?')[1]);
        const trackedUrl = new URL(queryParams.get('dl'));
        expect(trackedUrl.pathname).to('equal', page);
      });
    });
  });
  it('tracks a page view in Google Analytics v4 for org when org has enabled Google Analytics v4', () => {
    cy.intercept({ method: 'GET', pathname: getEndpoint(FULL_PAGE) }, { body: livePageFixture, statusCode: 200 }).as(
      'getPageDetail'
    );
    HUB_AND_ORG_TRACKED_PAGES.forEach((page) => {
      cy.visit(page);
      cy.wait('@getPageDetail');
      cy.wait('@trackPageViewOnOrgGaV4');
    });
  });
  it('tracks a page view in Facebook Pixel v4 for org when org has a Facebook Pixel id for rev program', () => {
    cy.intercept({ method: 'GET', pathname: getEndpoint(FULL_PAGE) }, { body: livePageFixture, statusCode: 200 }).as(
      'getPageDetail'
    );
    HUB_AND_ORG_TRACKED_PAGES.forEach((page) => {
      cy.visit(page);
      cy.wait('@getPageDetail');
      cy.wait('@trackPageViewOnOrgFbPixel');
    });
  });
});
