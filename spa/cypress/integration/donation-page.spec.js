import { STRIPE_PAYMENT, FULL_PAGE } from 'ajax/endpoints';
import { getEndpoint, getPageElementByType } from '../support/util';
import livePageOne from '../fixtures/pages/live-page-1.json';

import * as freqUtils from 'utilities/parseFrequency';
import calculateStripeFee from 'utilities/calculateStripeFee';

describe('Donation page', () => {
  beforeEach(() => {
    cy.intercept('/api/v1/organizations/stripe_account_id/**', { fixture: 'stripe/org-account-id.json' });
  });

  describe('Routing', () => {
    it('should send a request containing the correct query params', () => {
      const expectedRevProgramSlug = 'revenue-program-slug';
      const expectedPageSlug = 'page-slug';
      cy.intercept({ method: 'GET', pathname: getEndpoint(FULL_PAGE) }, (req) => {
        expect(req.url).contains(`revenue_program=${expectedRevProgramSlug}`);
        expect(req.url).contains(`page=${expectedPageSlug}`);
      });
      cy.visit(`/${expectedRevProgramSlug}/${expectedPageSlug}`);
    });

    it('should show live 404 page if api returns 404', () => {
      cy.intercept({ method: 'GET', pathname: getEndpoint(FULL_PAGE) }, { statusCode: 404 }).as('getPageDetail');
      cy.visit('/revenue-program-slug');
      cy.wait('@getPageDetail');
      cy.getByTestId('live-page-404').should('exist');
    });

    it('should show a donation page if route is not reserved, first-level', () => {
      cy.intercept(
        { method: 'GET', pathname: getEndpoint(FULL_PAGE) },
        { fixture: 'pages/live-page-1', statusCode: 200 }
      ).as('getPageDetail');
      cy.visit('/revenue-program-slug');
      cy.wait('@getPageDetail');
      cy.getByTestId('donation-page').should('exist');
    });

    it('should show a donation page if route is not reserved, second-level', () => {
      cy.intercept(
        { method: 'GET', pathname: getEndpoint(FULL_PAGE) },
        { fixture: 'pages/live-page-1', statusCode: 200 }
      ).as('getPageDetail');
      cy.visit('/revenue-program-slug/page-slug');
      cy.wait('@getPageDetail');
      cy.getByTestId('donation-page').should('exist');
    });
  });

  describe('DonationPage elements', () => {
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
          cy.getByTestId('pay-fees').scrollIntoView().find('label').contains(adverb);
        }
      });
    });

    it('should render the correct fee base on frequency and amount', () => {
      const frequency = getPageElementByType(livePageOne, 'DFrequency');
      const amounts = getPageElementByType(livePageOne, 'DAmount');

      frequency.content.forEach((freq) => {
        cy.contains(freq.displayName).click();
        amounts.content.options[freq.value].forEach((amount) => {
          cy.contains(amount).click();
          const calculatedFee = calculateStripeFee(amount, true, true);
          cy.getByTestId('pay-fees').scrollIntoView().find('label').contains(calculatedFee);
        });
      });
    });
  });

  describe('Resulting request', () => {
    it('should send a request with the expected interval', () => {
      cy.intercept(
        { method: 'GET', pathname: getEndpoint(FULL_PAGE) },
        { fixture: 'pages/live-page-1', statusCode: 200 }
      );

      const interval = 'One time';
      const amount = '120';
      cy.interceptDonation();
      cy.setUpDonation(interval, amount);
      cy.makeDonation();
      cy.wait('@stripePayment').its('request.body').should('have.property', 'interval', 'one_time');
    });
    it('should send a request with the expected amount', () => {
      cy.intercept(
        { method: 'GET', pathname: getEndpoint(FULL_PAGE) },
        { fixture: 'pages/live-page-1', statusCode: 200 }
      );

      const interval = 'One time';
      const amount = '120';
      cy.interceptDonation();
      cy.setUpDonation(interval, amount);
      cy.makeDonation();
      cy.wait('@stripePayment').its('request.body').should('have.property', 'amount', amount);
    });
  });

  describe('Donation page side effects', () => {
    it('should pass salesforce campaign id from query parameter to request body', () => {
      const sfCampaignId = 'my-test-sf-campaign-id';
      cy.intercept(
        { method: 'GET', pathname: `${getEndpoint(FULL_PAGE)}**` },
        { fixture: 'pages/live-page-1', statusCode: 200 }
      ).as('getPageDetail');
      cy.visit(`/revenue-program-slug/page-slug?campaign=${sfCampaignId}`);
      cy.wait('@getPageDetail');

      const interval = 'One time';
      const amount = '120';
      cy.intercept(
        { method: 'POST', pathname: getEndpoint(STRIPE_PAYMENT) },
        { fixture: 'stripe/payment-intent', statusCode: 200 }
      ).as('stripePayment');
      cy.setUpDonation(interval, amount);
      cy.makeDonation();
      cy.wait('@stripePayment').then(({ request }) => {
        expect(request.body).to.have.property('sf_campaign_id');
        expect(request.body.sf_campaign_id).to.equal(sfCampaignId);
      });
    });

    it('should use url frequency and url amount if present', () => {
      // intercept page, return particular elements
      const page = livePageOne;
      const amounts = livePageOne.elements.find((el) => el.type === 'DAmount');
      const targetFreq = 'monthly';
      const targetAmount = amounts.content.options.month[1];
      cy.intercept({ method: 'GET', pathname: `${getEndpoint(FULL_PAGE)}**` }, { body: page }).as('getPageDetail');

      // visit url + querystring
      cy.visit(`/revenue-program-slug/page-slug?amount=${targetAmount}&frequency=${targetFreq}`);
      cy.wait('@getPageDetail');

      // assert that the right things are checked
      cy.getByTestId('frequency-month-selected').should('exist');
      cy.getByTestId(`amount-${targetAmount}-selected`).should('exist');
    });

    it('should use url frequency and url amount in "other" if custom', () => {
      // intercept page, return particular elements
      const page = livePageOne;
      const targetFreq = 'monthly';
      const targetAmount = 99;
      cy.intercept({ method: 'GET', pathname: `${getEndpoint(FULL_PAGE)}**` }, { body: page }).as('getPageDetail');

      // visit url + querystring
      cy.visit(`/revenue-program-slug/page-slug?amount=${targetAmount}&frequency=${targetFreq}`);
      cy.wait('@getPageDetail');

      // assert that the right things are checked
      cy.getByTestId('frequency-month-selected').should('exist');
      cy.getByTestId(`amount-other-selected`).within(() => {
        cy.get('input').should('have.value', targetAmount);
      });
    });

    it('should use custom amount and one_time frequency if no frequency in url, and no other amounts should show', () => {
      // intercept page, return particular elements
      const page = livePageOne;
      const targetAmount = 99;
      const amounts = livePageOne.elements.find((el) => el.type === 'DAmount');
      cy.intercept({ method: 'GET', pathname: `${getEndpoint(FULL_PAGE)}**` }, { body: page }).as('getPageDetail');

      // visit url + querystring
      cy.visit(`/revenue-program-slug/page-slug?amount=${targetAmount}`);
      cy.wait('@getPageDetail');

      // assert that the right things are checked
      cy.getByTestId('frequency-one_time-selected').should('exist');
      cy.getByTestId(`amount-other-selected`).within(() => {
        cy.get('input').should('have.value', targetAmount);
      });

      amounts.content.options.one_time.forEach((amount) => {
        cy.getByTestId(`amount-${amount}`).should('not.exist');
      });
    });

    it('should use url frequency and default amount', () => {
      // intercept page, return particular elements
      const page = livePageOne;
      const targetFreq = 'monthly';
      cy.intercept({ method: 'GET', pathname: `${getEndpoint(FULL_PAGE)}**` }, { body: page }).as('getPageDetail');

      // visit url + querystring
      cy.visit(`/revenue-program-slug/page-slug?frequency=${targetFreq}`);
      cy.wait('@getPageDetail');

      // assert that the right things are checked
      cy.getByTestId('frequency-month-selected').should('exist');
    });
  });

  describe('Thank you page', () => {
    it('should show a generic Thank You page at /rev-slug/thank-you', () => {
      cy.intercept(
        { method: 'GET', pathname: getEndpoint(FULL_PAGE) },
        { fixture: 'pages/live-page-1', statusCode: 200 }
      );
      cy.visit('/revenue-program-slug/thank-you');
      cy.getByTestId('generic-thank-you').should('exist');
    });
    it('should show a generic Thank You page at /rev-slug/page-slug/thank-you', () => {
      cy.intercept(
        { method: 'GET', pathname: getEndpoint(FULL_PAGE) },
        { fixture: 'pages/live-page-1', statusCode: 200 }
      );
      cy.visit('/revenue-program-slug/page-slug/thank-you');
      cy.getByTestId('generic-thank-you').should('exist');
    });
  });
});
