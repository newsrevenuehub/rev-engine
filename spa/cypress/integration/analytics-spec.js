import cloneDeep from 'lodash.clonedeep';

import { CONTRIBUTOR_ENTRY, CONTRIBUTOR_VERIFY, CONTRIBUTOR_DASHBOARD, LOGIN } from 'routes';

import livePageFixture from '../fixtures/pages/live-page-1.json';
import { FULL_PAGE, ORG_STRIPE_ACCOUNT_ID } from 'ajax/endpoints';
import { getEndpoint } from '../support/util';

const LIVE_DONATION_PAGE_ROUTE = 'myprogram/mypage';
const HUB_GA_ID = 'UA-203260249-1';

describe('HubTrackedPage component', () => {
  beforeEach(() => {
    const gaGetScriptUrl = 'https://www.google-analytics.com/analytics.js';
    const gaCollectUrl = 'https://www.google-analytics.com/j/collect*';
    cy.intercept(gaGetScriptUrl, {
      fixture: '../fixtures/analytics/ga_v3_script'
    }).as('getGaAnalytics');
    cy.intercept({ url: gaCollectUrl }).as('collect');
    cy.intercept(getEndpoint(ORG_STRIPE_ACCOUNT_ID));
  });
  it('should add a Google Analytics V3 tracker for the Hub', () => {
    const HUB_GA_ID = 'UA-203260249-1';
    const hubTrackedPages = [LOGIN, CONTRIBUTOR_ENTRY, CONTRIBUTOR_VERIFY, CONTRIBUTOR_DASHBOARD];
    hubTrackedPages.forEach((page) => {
      cy.visit(page);
      cy.wait('@getGaAnalytics');
      cy.wait('@collect').then((interception) => {
        const searchParams = new URLSearchParams(interception.request.url.split('?')[1]);
        expect(searchParams.get('t')).to.equal('pageview');
        expect(searchParams.get('tid')).to.equal(HUB_GA_ID);
      });
    });
  });
});

describe('OrgAndHubTrackedPage component on live donation page', () => {
  beforeEach(() => {
    const gaGetScriptUrl = 'https://www.google-analytics.com/analytics.js';
    const gaCollectUrl = 'https://www.google-analytics.com/j/collect*';
    cy.intercept(gaGetScriptUrl, {
      fixture: '../fixtures/analytics/ga_v3_script'
    }).as('getGaAnalytics');
    cy.intercept({ url: gaCollectUrl }).as('collect');
    cy.intercept({ pathname: getEndpoint(ORG_STRIPE_ACCOUNT_ID) }, { statusCode: 200 }).as('getStripe');
  });

  it('tracks page view for Hub only when no org GA data', () => {
    const updatedFixture = cloneDeep(livePageFixture);
    updatedFixture.revenue_program.org_google_analytics_id = null;
    updatedFixture.revenue_program.org_google_analytics_domain = null;
    cy.intercept({ method: 'GET', pathname: getEndpoint(FULL_PAGE) }, { body: updatedFixture, statusCode: 200 }).as(
      'getPageDetail'
    );

    cy.visit(LIVE_DONATION_PAGE_ROUTE);
    cy.wait('@getPageDetail');
    cy.wait('@getStripe');
    cy.wait('@getGaAnalytics');
    cy.wait('@collect').then((interception) => {
      const searchParams = new URLSearchParams(interception.request.url.split('?')[1]);
      expect(searchParams.get('t')).to.equal('pageview');
      expect(searchParams.get('tid')).to.equal(HUB_GA_ID);
    });
  });

  it('tracks a page view for both Hub and Org when org has enabled Google Analytics v3', () => {
    cy.intercept({ method: 'GET', pathname: getEndpoint(FULL_PAGE) }, { body: livePageFixture, statusCode: 200 }).as(
      'getPageDetail'
    );
    cy.visit(LIVE_DONATION_PAGE_ROUTE);
    cy.wait(['@getPageDetail', '@getStripe', '@getGaAnalytics']);
    cy.wait('@collect').then((interception) => {
      const searchParams = new URLSearchParams(interception.request.url.split('?')[1]);
      expect(searchParams.get('t')).to.equal('pageview');
      expect(searchParams.get('tid')).to.equal(HUB_GA_ID);
    });
    cy.wait('@collect').then((interception) => {
      const searchParams = new URLSearchParams(interception.request.url.split('?')[1]);
      expect(searchParams.get('t')).to.equal('pageview');
      expect(searchParams.get('tid')).to.equal(livePageFixture.revenue_program.org_google_analytics_id);
    });
  });
});
