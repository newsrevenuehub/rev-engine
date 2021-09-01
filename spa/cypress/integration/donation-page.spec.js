import { STRIPE_PAYMENT, FULL_PAGE, ORG_STRIPE_ACCOUNT_ID } from 'ajax/endpoints';
import { getEndpoint, getPageElementByType } from '../support/util';
import livePageOne from '../fixtures/pages/live-page-1.json';
import orgAccountIdFixture from '../fixtures/stripe/org-account-id.json';

// Constants
import { CLEARBIT_SCRIPT_SRC } from '../../src/hooks/useClearbit';

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

    it('should send a confirmation request to Stripe with the organization stripe account id in the header', () => {
      /**
       * This tests against regressions that might cause the orgs stripe account id to not appear in the header of confirmCardPayment
       */
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
      cy.wait('@confirmCardPayment').its('request.body').should('include', orgAccountIdFixture.stripe_account_id);
    });

    it('should send a request with a Google reCAPTCHA token in request body', () => {
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
      cy.wait('@stripePayment').its('request.body').should('have.property', 'captcha_token');
    });
  });

  describe.only('Donation page side effects', () => {
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

    describe('Donation page amount and frequency query parameters', () => {
      specify('&frequency and &amount uses that frequency and that amount', () => {
        // intercept page, return particular elements
        const page = livePageOne;
        const amounts = livePageOne.elements.find((el) => el.type === 'DAmount');
        const targetFreq = 'monthly';
        const targetAmount = amounts.content.options.month[1];
        cy.intercept({ method: 'GET', pathname: `${getEndpoint(FULL_PAGE)}**` }, { body: page }).as('getPageDetail');

        // visit url + querystring
        cy.visit(`/revenue-program-slug/page-slug?amount=${targetAmount}&frequency=${targetFreq}`);
        cy.wait('@getPageDetail');
        cy.url().should('include', targetFreq);
        cy.url().should('include', targetAmount);

        // assert that the right things are checked
        cy.getByTestId('frequency-month-selected').should('exist');
        cy.getByTestId(`amount-${targetAmount}-selected`).should('exist');
      });

      specify('&frequency and @amount custom shows only that amount for frequency', () => {
        // intercept page, return particular elements
        const page = livePageOne;
        const targetFreq = 'monthly';
        const targetAmount = 99;
        cy.intercept({ method: 'GET', pathname: `${getEndpoint(FULL_PAGE)}**` }, { body: page }).as('getPageDetail');

        // visit url + querystring
        cy.visit(`/revenue-program-slug/page-slug?amount=${targetAmount}&frequency=${targetFreq}`);
        cy.wait('@getPageDetail');
        cy.url().should('include', targetAmount);

        // assert that the right things are checked
        cy.getByTestId('frequency-month-selected').should('exist');
        cy.getByTestId(`amount-other-selected`).within(() => {
          cy.get('input').should('have.value', targetAmount);
        });
      });

      specify('&amount but no &frequency defaults to that amount with the frequency=once', () => {
        // intercept page, return particular elements
        const page = livePageOne;
        const targetAmount = 99;
        const amounts = livePageOne.elements.find((el) => el.type === 'DAmount');
        cy.intercept({ method: 'GET', pathname: `${getEndpoint(FULL_PAGE)}**` }, { body: page }).as('getPageDetail');
        // visit url + querystring
        cy.visit(`/revenue-program-slug/page-slug?amount=${targetAmount}`);
        cy.wait('@getPageDetail');
        cy.url().should('include', targetAmount);
        // assert that the right things are checked
        cy.getByTestId('frequency-one_time-selected').should('exist');
        cy.getByTestId(`amount-other-selected`).within(() => {
          cy.get('input').should('have.value', targetAmount);
        });
        amounts.content.options.one_time.forEach((amount) => {
          cy.getByTestId(`amount-${amount}`).should('not.exist');
        });
      });

      specify('&frequency=once but no amount defaults to the one-time default set by the page creator', () => {
        // intercept page, return particular elements
        const page = livePageOne;
        const targetFreq = 'once';
        cy.intercept({ method: 'GET', pathname: `${getEndpoint(FULL_PAGE)}**` }, { body: page }).as('getPageDetail');

        // visit url + querystring
        cy.visit(`/revenue-program-slug/page-slug?frequency=${targetFreq}`);
        cy.wait('@getPageDetail');
        cy.url().should('include', targetFreq);

        // assert that the right things are checked
        cy.getByTestId('frequency-one_time-selected').should('exist');
      });

      specify('&frequency=yearly but no amount defaults to the yearly default set by the page creator', () => {
        // intercept page, return particular elements
        const page = livePageOne;
        const targetFreq = 'yearly';
        cy.intercept({ method: 'GET', pathname: `${getEndpoint(FULL_PAGE)}**` }, { body: page }).as('getPageDetail');

        // visit url + querystring
        cy.visit(`/revenue-program-slug/page-slug?frequency=${targetFreq}`);
        cy.wait('@getPageDetail');
        cy.url().should('include', targetFreq);

        // assert that the right things are checked
        cy.getByTestId('frequency-year-selected').should('exist');
      });

      specify('&frequency=monthly but no amount defaults to the monthly default set by the page creator', () => {
        // intercept page, return particular elements
        const page = livePageOne;
        const targetFreq = 'monthly';
        cy.intercept({ method: 'GET', pathname: `${getEndpoint(FULL_PAGE)}**` }, { body: page }).as('getPageDetail');

        // visit url + querystring
        cy.visit(`/revenue-program-slug/page-slug?frequency=${targetFreq}`);
        cy.wait('@getPageDetail');
        cy.url().should('include', targetFreq);

        // assert that the right things are checked
        cy.getByTestId('frequency-month-selected').should('exist');
      });
    });
  });

  describe('404 behavior', () => {
    it('should show 404 if request live page returns non-200', () => {
      cy.intercept(
        { method: 'GET', pathname: getEndpoint(FULL_PAGE) },
        { fixture: 'pages/live-page-1', statusCode: 404 }
      ).as('getLivePage');
      cy.visit('/revenue-program-slug/page-slug');
      cy.url().should('include', '/revenue-program-slug/page-slug');
      cy.wait('@getLivePage');
      cy.getByTestId('live-page-404').should('exist');
    });

    it('should show 404 if request stripe account id returns non-200', () => {
      cy.intercept(
        { method: 'GET', pathname: getEndpoint(FULL_PAGE) },
        { fixture: 'pages/live-page-1', statusCode: 200 }
      );
      cy.intercept(
        { method: 'GET', pathname: getEndpoint(ORG_STRIPE_ACCOUNT_ID) },
        { body: { stripe_account_id: 'abc123' }, statusCode: 500 }
      ).as('getStripeAccountId');
      cy.visit('/revenue-program-slug/page-slug');
      cy.url().should('include', '/revenue-program-slug/page-slug');
      cy.wait('@getStripeAccountId');
      cy.getByTestId('live-page-404').should('exist');
    });

    it('should not show 404 otherwise', () => {
      cy.intercept(
        { method: 'GET', pathname: getEndpoint(FULL_PAGE) },
        { fixture: 'pages/live-page-1', statusCode: 200 }
      ).as('getLivePage');
      cy.intercept(
        { method: 'GET', pathname: getEndpoint(ORG_STRIPE_ACCOUNT_ID) },
        { body: { stripe_account_id: 'abc123' }, statusCode: 200 }
      ).as('getStripeAccountId');
      cy.visit('/revenue-program-slug/page-slug');
      cy.url().should('include', '/revenue-program-slug/page-slug');
      cy.wait('@getLivePage');
      cy.wait('@getStripeAccountId');
      cy.getByTestId('live-page-404').should('not.exist');
      cy.getByTestId('donation-page').should('exist');
    });

    it('should contain clearbit.js script in body', () => {
      cy.get('head').find(`script[src*="${CLEARBIT_SCRIPT_SRC}"]`).should('have.length', 1);
    });
  });

  describe('Footer-like content', () => {
    before(() => {
      cy.intercept(
        { method: 'GET', pathname: getEndpoint(FULL_PAGE) },
        { fixture: 'pages/live-page-1', statusCode: 200 }
      ).as('getPage');
      cy.intercept('/api/v1/organizations/stripe_account_id/**', { fixture: 'stripe/org-account-id.json' }).as(
        'getStripeAccountId'
      );
      cy.visit('/revenue-program-slug/page-slug');
      cy.url().should('include', '/revenue-program-slug/page-slug');
      cy.wait('@getPage');
      cy.wait('@getStripeAccountId');
    });

    it('should render page footer with link to fundjournalism.org', () => {
      cy.getByTestId('donation-page-footer').should('exist');
      cy.getByTestId('donation-page-footer')
        .contains('fundjournalism.org')
        .should('have.attr', 'href', 'https://fundjournalism.org/');
    });

    it('should render correct copyright info, including revenue program name', () => {
      cy.getByTestId('donation-page-footer').contains(
        new Date().getFullYear() + ' ' + livePageOne.revenue_program.name
      );
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

    it('should render revenue program address if present, nothing if not', () => {
      const expectedString = `Prefer to mail a check? Our mailing address is ${livePageOne.revenue_program.address}.`;
      // If revenue_program.address is present, should show...
      cy.getByTestId('donation-page-static-text').contains(expectedString).should('exist');

      // ...but if we remove it, shouldn't show
      const page = { ...livePageOne };
      page.revenue_program.address = '';
      cy.intercept({ method: 'GET', pathname: getEndpoint(FULL_PAGE) }, { body: page, statusCode: 200 });
      cy.visit('/revenue-program-slug/page-slug');
      cy.getByTestId('donation-page-static-text').contains(expectedString).should('not.exist');
    });

    it('should render certain text if the org is nonprofit', () => {
      const nonProfitPage = { ...livePageOne };
      // ensure contact_email, so text section shows up at all
      nonProfitPage.revenue_program.contact_email = 'testing@test.com';
      nonProfitPage.organization_is_nonprofit = true;
      cy.intercept({ method: 'GET', pathname: getEndpoint(FULL_PAGE) }, { body: nonProfitPage, statusCode: 200 }).as(
        'getNonProfitPage'
      );
      cy.visit('/revenue-program-slug/page-slug-6');
      cy.url().should('include', '/revenue-program-slug/page-slug-6');
      cy.wait('@getNonProfitPage');
      // If org is non-profit, show certain text...
      cy.getByTestId('donation-page-static-text').contains('are tax deductible').should('exist');
      cy.getByTestId('donation-page-static-text').contains('change a recurring donation').should('exist');
    });

    it('should render different text if the org is for-profit', () => {
      const forProfitPage = { ...livePageOne };
      forProfitPage.organization_is_nonprofit = false;
      cy.intercept({ method: 'GET', pathname: getEndpoint(FULL_PAGE) }, { body: forProfitPage, statusCode: 200 }).as(
        'getForProfitPage'
      );
      cy.visit('/revenue-program-slug/page-slug-2');
      cy.url().should('include', '/revenue-program-slug/page-slug-2');
      cy.wait('@getForProfitPage');
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
