import { LIVE_PAGE, STRIPE_CONFIRMATION, ORG_STRIPE_ACCOUNT_ID } from 'ajax/endpoints';
import { getEndpoint, getPageElementByType } from '../support/util';
import livePageOne from '../fixtures/pages/live-page-1.json';

import * as freqUtils from 'utilities/parseFrequency';

describe('Donation page', () => {
  before(() => {
    cy.intercept({ method: 'GET', pathname: getEndpoint(ORG_STRIPE_ACCOUNT_ID) }, { fixture: 'stripe/org-account-id' });
    cy.intercept('POST', getEndpoint(STRIPE_CONFIRMATION), { fixture: 'stripe/confirm-connected' });
    cy.login('user/stripe-verified.json');
  });

  describe('Routing', () => {
    it('should send a request containing the correct query params', () => {
      const expectedRevProgramSlug = 'revenue-program-slug';
      const expectedPageSlug = 'page-slug';
      cy.intercept({ method: 'GET', pathname: getEndpoint(LIVE_PAGE) }, (req) => {
        expect(req.url).contains(`revenue_program=${expectedRevProgramSlug}`);
        expect(req.url).contains(`page=${expectedPageSlug}`);
      });
      cy.visit(`/${expectedRevProgramSlug}/${expectedPageSlug}`);
    });

    it('should show live 404 page if api returns 404', () => {
      cy.intercept({ method: 'GET', pathname: getEndpoint(LIVE_PAGE) }, { statusCode: 404 }).as('getPageDetail');
      cy.visit('/revenue-program-slug');
      cy.wait('@getPageDetail');
      cy.getByTestId('live-page-404').should('exist');
    });

    it('should show a donation page if route is not reserved, first-level', () => {
      cy.intercept(
        { method: 'GET', pathname: getEndpoint(LIVE_PAGE) },
        { fixture: 'pages/live-page-1', statusCode: 200 }
      ).as('getPageDetail');
      cy.visit('/revenue-program-slug');
      cy.wait('@getPageDetail');
      cy.getByTestId('donation-page').should('exist');
    });

    it('should show a donation page if route is not reserved, second-level', () => {
      cy.intercept(
        { method: 'GET', pathname: getEndpoint(LIVE_PAGE) },
        { fixture: 'pages/live-page-1', statusCode: 200 }
      ).as('getPageDetail');
      cy.visit('/revenue-program-slug/page-slug');
      cy.wait('@getPageDetail');
      cy.getByTestId('donation-page').should('exist');
    });
  });

  describe.only('DonationPage content', () => {
    it('should render expected rich text content', () => {
      cy.visitDonationPage();

      cy.getByTestId('d-rich-text').should('exist');
      cy.contains('Your support keeps us going!');
    });

    it('should render expected expected frequencies', () => {
      const frequency = getPageElementByType(livePageOne, 'DFrequency');
      cy.getByTestId('d-frequency');

      frequency.content.forEach((freq) => {
        cy.contains(freq.displayName);
      });
    });
    it('should render expected amounts', () => {
      const frequency = getPageElementByType(livePageOne, 'DFrequency');
      const amounts = getPageElementByType(livePageOne, 'DAmount');
      cy.getByTestId('d-amount');

      frequency.content.forEach((freq) => {
        cy.contains(freq.displayName).click();
        amounts.content.options[freq.value].forEach((amount) => cy.contains(amount));
      });
    });
    it('should render text indicating expected frequencies', () => {
      const frequency = getPageElementByType(livePageOne, 'DFrequency');
      // const amounts = getPageElementByType(livePageOne, 'DAmount');
      cy.getByTestId('d-amount');

      frequency.content.forEach((freq) => {
        cy.contains(freq.displayName).click();
        const adjective = freqUtils.getFrequencyAdjective(freq.value);
        const rate = freqUtils.getFrequencyRate(freq.value);
        const adverb = freqUtils.getFrequencyAdverb(freq.value);

        cy.getByTestId('d-amount').find('h3').contains(adjective);
        if (rate) {
          cy.getByTestId('custom-amount-rate').contains(rate);
        }
        if (adverb) {
          cy.getByTestId('pay-fees').find('label').contains(adverb);
        }
      });
    });
  });

  describe('Thank you page', () => {
    it('should show a generic Thank You page at /rev-slug/thank-you', () => {
      cy.intercept(
        { method: 'GET', pathname: getEndpoint(LIVE_PAGE) },
        { fixture: 'pages/live-page-1', statusCode: 200 }
      );
      cy.visit('/revenue-program-slug/thank-you');
      cy.getByTestId('generic-thank-you').should('exist');
    });
    it('should show a generic Thank You page at /rev-slug/page-slug/thank-you', () => {
      cy.intercept(
        { method: 'GET', pathname: getEndpoint(LIVE_PAGE) },
        { fixture: 'pages/live-page-1', statusCode: 200 }
      );
      cy.visit('/revenue-program-slug/page-slug/thank-you');
      cy.getByTestId('generic-thank-you').should('exist');
    });
  });
});
