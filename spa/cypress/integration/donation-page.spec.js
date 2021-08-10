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

  describe('Stripe payment functions unit tests', () => {
    before(() => {
      cy.intercept(
        { method: 'POST', pathname: getEndpoint(STRIPE_PAYMENT) },
        { fixture: 'pages/live-page-1', statusCode: 200 }
      ).as('createStripePayment');
      cy.intercept({ method: 'POST', url: 'https://api.stripe.com/v1/payment_methods' }).as(
        'stripeCreatePaymentMethod'
      );
      cy.intercept({ method: 'POST', url: 'http://localhost:3000/api/v1/stripe/payment/' }).as(
        'stripeConfirmCardPayment'
      );
    });
  });

  describe('Resulting request', () => {
    it('should send a request with the expected interval', () => {
      cy.intercept(
        { method: 'GET', pathname: getEndpoint(FULL_PAGE) },
        { fixture: 'pages/live-page-1', statusCode: 200 }
      );

      const interval = 'one_time';
      const amount = '120';
      cy.interceptDonation();
      cy.setUpDonation(interval, amount);
      cy.makeDonation();
      cy.wait('@stripePayment').its('request.body').should('have.property', 'interval', interval);
    });
    it('should send a request with the expected amount', () => {
      cy.intercept(
        { method: 'GET', pathname: getEndpoint(FULL_PAGE) },
        { fixture: 'pages/live-page-1', statusCode: 200 }
      );

      const interval = 'one_time';
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

      const interval = 'one_time';
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
  });

  describe('Footer-like content', () => {
    before(() => {
      cy.intercept(
        { method: 'GET', pathname: getEndpoint(FULL_PAGE) },
        { fixture: 'pages/live-page-1', statusCode: 200 }
      );
      cy.visit('/revenue-program-slug/page-slug');
    });

    it('should render page footer with link to fundjournalism.org', () => {
      cy.getByTestId('donation-page-footer').should('exist');
      cy.getByTestId('donation-page-footer')
        .contains('fundjournalism.org')
        .should('have.attr', 'href', 'https://fundjournalism.org/');
    });

    it('should render correct copyright info, including org name', () => {
      cy.getByTestId('donation-page-footer').contains(new Date().getFullYear() + ' ' + livePageOne.organization_name);
    });

    it('should render organization contact email if present, nothing if not', () => {
      const expectedString = `Contact us at ${livePageOne.organization_contact_email}`;
      // If organization_contact_email is present, should show...
      cy.getByTestId('donation-page-static-text').contains(expectedString).should('exist');

      // ...but if we remove it, shouldn't show
      const page = { ...livePageOne };
      page.organization_contact_email = '';
      cy.intercept({ method: 'GET', pathname: getEndpoint(FULL_PAGE) }, { body: page, statusCode: 200 });
      cy.visit('/revenue-program-slug/page-slug-2');
      cy.getByTestId('donation-page-static-text').contains(expectedString).should('not.exist');
    });

    it('should render organization address if present, nothing if not', () => {
      const expectedString = `Prefer to mail a check? Our mailing address is ${livePageOne.organization_address}`;
      // If organization_address is present, should show...
      cy.getByTestId('donation-page-static-text').contains(expectedString).should('exist');

      // ...but if we remove it, shouldn't show
      const page = { ...livePageOne };
      page.organization_address = '';
      cy.intercept({ method: 'GET', pathname: getEndpoint(FULL_PAGE) }, { body: page, statusCode: 200 });
      cy.visit('/revenue-program-slug/page-slug');
      cy.getByTestId('donation-page-static-text').contains(expectedString).should('not.exist');
    });

    it('should render different text based on whether or not the org is nonprofit', () => {
      // If org is non-profit, show certain text...
      cy.getByTestId('donation-page-static-text').contains('are tax deductible').should('exist');
      cy.getByTestId('donation-page-static-text').contains('change a recurring donation').should('exist');

      // ...if not, show different text.
      const page = { ...livePageOne };
      page.organization_is_nonprofit = false;
      cy.intercept({ method: 'GET', pathname: getEndpoint(FULL_PAGE) }, { body: page, statusCode: 200 });
      cy.visit('/revenue-program-slug/page-slug-2');
      cy.getByTestId('donation-page-static-text').contains('are not tax deductible').should('exist');
      cy.getByTestId('donation-page-static-text').contains('change a recurring contribution').should('exist');
    });

    it('should show different content based on the selected amount and frequency', () => {
      const targetAmount = 15;
      // if frequency is recurring, show additional agreement statement...
      cy.getByTestId(`frequency-month`).click();
      cy.getByTestId(`amount-${targetAmount}`).click();
      const expectedText = `payments of $${targetAmount}, to be processed on or adjacent to the ${new Date().getDate()}`;
      cy.getByTestId('donation-page-static-text').contains(expectedText).should('exist');

      // ... but if it's one-time, don't
      cy.getByTestId(`frequency-one_time`).click();
      cy.getByTestId('donation-page-static-text').contains(expectedText).should('not.exist');
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
