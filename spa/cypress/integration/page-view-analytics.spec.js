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

import livePageFixture from '../fixtures/pages/live-page-1.json';
import { FULL_PAGE } from 'ajax/endpoints';
import { getEndpoint } from '../support/util';
import { HUB_GA_V3_ID } from 'constants/analyticsConstants';

const REVENUE_PROGRAM = 'myprogram';
const PAGE_NAME = 'mypage';

const DONATION_PAGE_VIA_REV_PROGRAM_PAGE = `/${REVENUE_PROGRAM}/${PAGE_NAME}`;
const DONATION_PAGE_VIA_REV_PROGRAM = `/${REVENUE_PROGRAM}`;

const EDITOR_ROUTE_REV = `${EDITOR_ROUTE}/${REVENUE_PROGRAM}`;
const EDITOR_ROUTE_PAGE = `${EDITOR_ROUTE}/${DONATION_PAGE_VIA_REV_PROGRAM_PAGE}`;

const HUB_TRACKED_PAGES = [
  LOGIN,
  MAIN_CONTENT_SLUG,
  ORGANIZATION_SLUG,
  DONATIONS_SLUG,
  PAGES_SLUG,
  EDITOR_ROUTE,
  EDITOR_ROUTE_REV,
  EDITOR_ROUTE_PAGE,
  CONTRIBUTOR_ENTRY,
  CONTRIBUTOR_VERIFY,
  CONTRIBUTOR_DASHBOARD
];

// NB: The THANK_YOU_SLUG page is also tracked by both hub and org
// but at the moment there is not a convenient way to test thank you page
// for org analytics, because it depends on being sent there from successful
// donation on donation page, and in turn, that is tied to things going right
// with the Stripe API, which doesn't happen by default (long story, that one...)
const HUB_AND_ORG_TRACKED_PAGES = [DONATION_PAGE_VIA_REV_PROGRAM, DONATION_PAGE_VIA_REV_PROGRAM_PAGE];

describe('Pages that are only tracked by Hub', () => {
  beforeEach(() => {
    // const gaGetScriptUrl = 'https://www.google-analytics.com/analytics.js';
    // const gaV3CollectUrl = 'https://www.google-analytics.com/j/collect*';
    const gaV3CollectUrl = new URL('https://www.google-analytics.com/j/collect');
    // cy.intercept(gaGetScriptUrl, {
    //   fixture: '../fixtures/analytics/ga_v3_script'
    // }).as('getGaV3Analytics');
    cy.intercept({
      hostname: gaV3CollectUrl.hostname,
      pathname: gaV3CollectUrl.pathname,
      query: {
        t: 'pageview',
        tid: HUB_GA_V3_ID
      }
    }).as('trackPageViewOnHubGaV3');
    // cy.intercept(getEndpoint(ORG_STRIPE_ACCOUNT_ID));
  });
  it('should send a page view to the Hub Google Analytics v3 account for all Hub-only pages', () => {
    HUB_TRACKED_PAGES.forEach((page) => {
      cy.visit(page);
      cy.wait('@trackPageViewOnHubGaV3').then((interception) => {
        // show correct page reflected
      });
    });
  });
});

describe('Pages that are tracked by both the hub and the org', () => {
  beforeEach(() => {
    // Google Analytics V3
    const gaV3CollectUrl = new URL('https://www.google-analytics.com/j/collect');

    cy.intercept({
      hostname: gaV3CollectUrl.hostname,
      pathname: gaV3CollectUrl.pathname,
      query: {
        v: '1',
        t: 'pageview',
        tid: HUB_GA_V3_ID
      }
    }).as('trackPageViewOnHubGaV3');

    cy.intercept({
      hostname: gaV3CollectUrl.hostname,
      pathname: gaV3CollectUrl.pathname,
      query: {
        v: '1',
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
    // const fbPixelInitUrl = new URL(
    //   `https://connect.facebook.net/signals/config/${livePageFixture.revenue_program.facebook_pixel_id}`
    // );
    const fbPixelCollectUrl = new URL('https://www.facebook.com/tr/');
    // cy.intercept({
    //   hostname: fbPixelInitUrl.hostname,
    //   pathname: fbPixelInitUrl.pathname
    // }).as('initFbPixelInstance');
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
        // confirm correct page view data sent
        expect(interception.request.dl).to('equal');
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
      cy.wait(['@trackPageViewOnHubGaV3', '@trackPageViewOnOrgGaV3']);
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
