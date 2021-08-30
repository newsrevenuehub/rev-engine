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
          const calculatedFee = calculateStripeFee(amount, freq.value, true);
          cy.getByTestId('pay-fees').scrollIntoView().find('label').contains(calculatedFee);
        });
      });
    });

    it('should select agreeToPayFees by default if appropriate page property is set', () => {
      const page = { ...livePageOne };
      const paymentIndex = page.elements.findIndex((el) => el.type === 'DPayment');
      page.elements[paymentIndex].content.payFeesDefault = true;
      cy.intercept({ method: 'GET', pathname: getEndpoint(FULL_PAGE) }, { body: page, statusCode: 200 }).as(
        'getPageWithPayFeesDefault'
      );
      cy.visit('/revenue-program-slug/page-slug');
      cy.url().should('include', '/revenue-program-slug/page-slug');
      cy.wait('@getPageWithPayFeesDefault');

      cy.getByTestId('pay-fees-checked').should('exist');
      cy.getByTestId('pay-fees-not-checked').should('not.exist');
    });
  });

  describe('Resulting request', () => {
    it('should send a request with the expected interval', () => {
      cy.intercept(
        { method: 'GET', pathname: getEndpoint(FULL_PAGE) },
        { fixture: 'pages/live-page-1', statusCode: 200 }
      ).as('getPage');

      cy.visit('/rev-program-slug');
      cy.url().should('include', 'rev-program-slug');
      cy.wait('@getPage');

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
      ).as('getPage');

      cy.visit('/rev-program-slug');
      cy.url().should('include', 'rev-program-slug');
      cy.wait('@getPage');

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
      const expectedString = `Contact us at ${livePageOne.revenue_program.contact_email}`;
      // If revenue_program.contact_email is present, should show...
      cy.getByTestId('donation-page-static-text').contains(expectedString).should('exist');

      // ...but if we remove it, shouldn't show
      const page = { ...livePageOne };
      page.revenue_program.contact_email = '';
      cy.intercept({ method: 'GET', pathname: getEndpoint(FULL_PAGE) }, { body: page, statusCode: 200 });
      cy.visit('/revenue-program-slug/page-slug-2');
      cy.getByTestId('donation-page-static-text').contains(expectedString).should('not.exist');
    });

    it('should render organization address if present, nothing if not', () => {
      const expectedString = `Prefer to mail a check? Our mailing address is ${livePageOne.organization_address}.`;
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
      cy.intercept(
        { method: 'GET', pathname: getEndpoint(FULL_PAGE) },
        { fixture: 'pages/live-page-1', statusCode: 200 }
      ).as('getPage');
      cy.visit('/revenue-program-slug/page-slug-3');
      cy.url().should('include', 'revenue-program-slug/page-slug-3');
      cy.wait('@getPage');
      const targetAmount = 15;
      // if frequency is recurring, show additional agreement statement...
      cy.getByTestId('frequency-month').click();
      cy.getByTestId(`amount-${targetAmount}`).click();
      const expectedText = `payments of $${targetAmount}, to be processed on or adjacent to the ${new Date().getDate()}`;
      cy.getByTestId('donation-page-static-text').contains(expectedText).should('exist');

      // ... but if it's one-time, don't
      cy.getByTestId('frequency-one_time').click();
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
