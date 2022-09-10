import {
  LIVE_PAGE_DETAIL,
  AUTHORIZE_ONE_TIME_STRIPE_PAYMENT_ROUTE,
  AUTHORIZE_STRIPE_SUBSCRIPTION_ROUTE
} from 'ajax/endpoints';
import { getEndpoint, getPageElementByType, getTestingDonationPageUrl, EXPECTED_RP_SLUG } from '../support/util';
import livePageOne from '../fixtures/pages/live-page-1.json';

// Constants
import { CLEARBIT_SCRIPT_SRC } from '../../src/hooks/useClearbit';

import * as freqUtils from 'utilities/parseFrequency';
import calculateStripeFee from 'utilities/calculateStripeFee';

const expectedPageSlug = 'page-slug';

describe('Clearbit', () => {
  it('load clearbit', () => {
    cy.intercept(
      { method: 'GET', pathname: getEndpoint(LIVE_PAGE_DETAIL) },
      { fixture: 'pages/live-page-1', statusCode: 200 }
    ).as('getPageDetail');
    cy.visitDonationPage();
    cy.getByTestId('donation-page').should('exist');
    cy.get('head').find(`script[src*="${CLEARBIT_SCRIPT_SRC}"]`).should('have.length', 1);
  });
});

describe('Donation page displays dynamic page elements', () => {
  beforeEach(() => cy.visitDonationPage());

  it('should render expected rich text content', () => {
    cy.getByTestId('d-rich-text').should('exist');
    cy.contains('Your support keeps us going!');
  });

  it('should render expected expected frequencies', () => {
    const frequency = getPageElementByType(livePageOne, 'DFrequency');
    cy.getByTestId('d-frequency');
    frequency.content.forEach((freq) => cy.contains(freq.displayName));
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
      cy.getByTestId('d-amount').find('h2').contains(adjective);
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
    cy.intercept({ method: 'GET', pathname: getEndpoint(LIVE_PAGE_DETAIL) }, { body: page, statusCode: 200 }).as(
      'getPageWithPayFeesDefault'
    );
    cy.visit(getTestingDonationPageUrl(expectedPageSlug));
    cy.url().should('include', EXPECTED_RP_SLUG);
    cy.url().should('include', expectedPageSlug);
    cy.wait(['@getPageWithPayFeesDefault']);
    cy.getByTestId('pay-fees-checked').should('exist');
    cy.getByTestId('pay-fees-not-checked').should('not.exist');
  });

  it('should render DSwag', () => {
    cy.visitDonationPage();
    cy.getByTestId('d-swag').should('exist');
  });

  it('should render swag options if swagThreshold is met', () => {
    const swagElement = livePageOne.elements.find((el) => el.type === 'DSwag');
    const swagThreshold = swagElement.content.swagThreshold;
    cy.contains(`Give a total of ${livePageOne.currency.symbol}${swagThreshold} /year or more to be eligible`);
    cy.getByTestId('swag-content').should('not.exist');
    cy.setUpDonation('Yearly', '365');
    cy.getByTestId('swag-content').should('exist');
  });

  it('should render a dropdown of swagOptions for each swag in the list', () => {
    cy.setUpDonation('Yearly', '365');
    const swagElement = livePageOne.elements.find((el) => el.type === 'DSwag');
    const swagName = swagElement.content.swags[0].swagName;
    const optionsNum = swagElement.content.swags[0].swagOptions.length;
    cy.contains('Totes Dope Tote').should('exist');
    cy.getByTestId(`swag-item-${swagName}`).should('exist');
    cy.getByTestId(`swag-choices-${swagName}`).should('exist');
    cy.getByTestId(`swag-choices-${swagName}`).click();
    const dropdownName = `swag_choice_${swagName}`;
    cy.getByTestId(`select-dropdown-${dropdownName}`).find('li').its('length').should('eq', optionsNum);
  });

  it('should not show nyt comp subscription option if not enabled', () => {
    const page = { ...livePageOne };
    const swagIndex = page.elements.findIndex((el) => el.type === 'DSwag');
    page.elements[swagIndex].content.offerNytComp = false;
    cy.intercept({ method: 'GET', pathname: getEndpoint(LIVE_PAGE_DETAIL) }, { body: page, statusCode: 200 }).as(
      'getPage'
    );
    cy.visit(getTestingDonationPageUrl(expectedPageSlug));
    cy.url().should('include', EXPECTED_RP_SLUG);
    cy.url().should('include', expectedPageSlug);
    cy.wait('@getPage');

    cy.setUpDonation('One time', '365');
    cy.getByTestId('nyt-comp-sub').should('not.exist');
  });

  it('should display nyt comp subscription option if enabled', () => {
    const page = { ...livePageOne };
    const swagIndex = page.elements.findIndex((el) => el.type === 'DSwag');
    page.elements[swagIndex].content.offerNytComp = true;
    cy.intercept({ method: 'GET', pathname: getEndpoint(LIVE_PAGE_DETAIL) }, { body: page, statusCode: 200 }).as(
      'getPage'
    );
    cy.visit(getTestingDonationPageUrl(expectedPageSlug));
    cy.url().should('include', EXPECTED_RP_SLUG);
    cy.url().should('include', expectedPageSlug);
    cy.wait('@getPage');

    cy.setUpDonation('One time', '365');
    cy.getByTestId('nyt-comp-sub').should('exist');
  });
});

describe('Reason for Giving element', () => {
  before(() => {
    cy.visitDonationPage();
  });

  it('should render the Reason for Giving element', () => {
    cy.getByTestId('d-reason').should('exist');
  });

  it('should render picklist with options', () => {
    cy.getByTestId('excited-to-support-picklist').should('exist');
    cy.getByTestId('excited-to-support-picklist').click();
    cy.getByTestId('select-item-1').click();
  });

  it('should not show "honoree/in_memory_of" input if "No" is selected', () => {
    // tribute_type "No" has value "", hense `tribute-""`.
    cy.getByTestId('tribute-')
      .get('input')
      .then(($input) => {
        cy.log($input);
        expect($input).to.be.checked;
      });

    cy.getByTestId('tribute-input').should('not.exist');
  });

  it('should show tribute input if honoree or in_memory_of is selected', () => {
    cy.getByTestId('tribute-type_honoree').click();
    cy.getByTestId('tribute-input').should('exist');

    cy.getByTestId('tribute-type_in_memory_of').click();
    cy.getByTestId('tribute-input').should('exist');
  });
});

// SHOULD BE JEST TEST
describe('Donation page amount and frequency query parameters', () => {
  beforeEach(() => {
    cy.interceptDonation();
    cy.intercept({ method: 'GET', pathname: `${getEndpoint(LIVE_PAGE_DETAIL)}**` }, { body: livePageOne }).as(
      'getPageDetail'
    );
  });
  specify('&frequency and &amount uses that frequency and that amount', () => {
    // intercept page, return particular elements
    const amounts = livePageOne.elements.find((el) => el.type === 'DAmount');
    const targetFreq = 'monthly';
    const targetAmount = amounts.content.options.month[1];

    // visit url + querystring
    cy.visit(getTestingDonationPageUrl(expectedPageSlug, `?amount=${targetAmount}&frequency=${targetFreq}`));
    cy.wait('@getPageDetail');
    cy.url().should('include', EXPECTED_RP_SLUG);
    cy.url().should('include', expectedPageSlug);
    cy.url().should('include', targetFreq);
    cy.url().should('include', targetAmount);

    // assert that the right things are checked
    cy.getByTestId('frequency-month-selected').should('exist');
    cy.getByTestId(`amount-${targetAmount}-selected`).should('exist');
  });

  specify('&frequency and &amount custom shows only that amount for frequency', () => {
    const targetFreq = 'monthly';
    const targetAmount = 99;
    // visit url + querystring
    cy.visit(getTestingDonationPageUrl(expectedPageSlug, `?amount=${targetAmount}&frequency=${targetFreq}`));
    cy.wait('@getPageDetail');
    cy.url().should('include', EXPECTED_RP_SLUG);
    cy.url().should('include', expectedPageSlug);
    cy.url().should('include', targetFreq);
    cy.url().should('include', targetAmount);

    // assert that the right things are checked
    cy.getByTestId('frequency-month-selected').should('exist');
    cy.getByTestId(`amount-other-selected`).within(() => {
      cy.get('input').should('have.value', targetAmount);
    });
  });

  specify('&amount but no &frequency defaults to that amount with the frequency=once', () => {
    // intercept page, return particular elements
    const targetAmount = 99;

    // visit url + querystring
    cy.visit(getTestingDonationPageUrl(expectedPageSlug, `?amount=${targetAmount}`));
    cy.wait('@getPageDetail');
    cy.url().should('include', EXPECTED_RP_SLUG);
    cy.url().should('include', expectedPageSlug);
    cy.url().should('include', targetAmount);

    // assert that the right things are checked
    cy.getByTestId('frequency-one_time-selected').should('exist');
    cy.getByTestId(`amount-other-selected`).within(() => {
      cy.get('input').should('have.value', targetAmount);
    });
  });

  specify('&frequency=once but no amount defaults to the one-time default set by the page creator', () => {
    const targetFreq = 'once';
    // visit url + querystring
    cy.visit(getTestingDonationPageUrl(expectedPageSlug, `?frequency=${targetFreq}`));
    cy.wait('@getPageDetail');
    cy.url().should('include', EXPECTED_RP_SLUG);
    cy.url().should('include', expectedPageSlug);
    cy.url().should('include', targetFreq);

    // assert that the right things are checked
    cy.getByTestId('frequency-one_time-selected').should('exist');
  });

  specify('&frequency=yearly but no amount defaults to the yearly default set by the page creator', () => {
    const targetFreq = 'yearly';
    // visit url + querystring
    cy.visit(getTestingDonationPageUrl(expectedPageSlug, `?frequency=${targetFreq}`));
    cy.wait('@getPageDetail');
    cy.url().should('include', EXPECTED_RP_SLUG);
    cy.url().should('include', expectedPageSlug);
    cy.url().should('include', targetFreq);

    // assert that the right things are checked
    cy.getByTestId('frequency-year-selected').should('exist');
  });

  specify('&frequency=monthly but no amount defaults to the monthly default set by the page creator', () => {
    const targetFreq = 'monthly';
    // visit url + querystring
    cy.visit(getTestingDonationPageUrl(expectedPageSlug, `?frequency=${targetFreq}`));
    cy.wait('@getPageDetail');
    cy.url().should('include', EXPECTED_RP_SLUG);
    cy.url().should('include', expectedPageSlug);
    cy.url().should('include', targetFreq);

    // assert that the right things are checked
    cy.getByTestId('frequency-month-selected').should('exist');
  });
});

describe('404 behavior', () => {
  it('should show live 404 page if api returns 404', () => {
    cy.intercept({ method: 'GET', pathname: getEndpoint(LIVE_PAGE_DETAIL) }, { statusCode: 404 }).as('getPageDetail');
    cy.visit(getTestingDonationPageUrl(expectedPageSlug));
    cy.wait('@getPageDetail');
    cy.getByTestId('live-page-404').should('exist');
  });
});

describe('Footer-like content', () => {
  beforeEach(() => cy.visitDonationPage());

  it('should render page footer with link to fundjournalism.org', () => {
    cy.getByTestId('donation-page-footer').should('exist');
    cy.getByTestId('donation-page-footer')
      .contains('fundjournalism.org')
      .should('have.attr', 'href', 'https://fundjournalism.org/');
  });

  it('should render correct copyright info, including revenue program name', () => {
    cy.getByTestId('donation-page-footer').contains(new Date().getFullYear() + ' ' + livePageOne.revenue_program.name);
  });
});

function fillOutAddressSection() {
  cy.get('[data-testid*="mailing_street"]').type('123 Main St');
  cy.get('[data-testid*="mailing_city"]').type('Big City');
  cy.get('[data-testid*="mailing_state"]').type('NY');
  cy.get('[data-testid*="mailing_postal_code"]').type('100738');
  cy.get('.country-select').click().find('.react-select-country__option').first().click();
}

function fillOutDonorInfoSection() {
  cy.get('[data-testid*="first_name"]').type('Fred');
  cy.get('[data-testid*="last_name"]').type('Person');
  cy.get('[data-testid*="email"]').type('foo@bar.com');
}

function fillOutReasonForGiving() {
  cy.get('[data-testid="excited-to-support-picklist"]').click();
  cy.get('[data-testid="select-item-1').click();
}

describe('User flow: happy path', () => {
  beforeEach(() => cy.visitDonationPage());

  specify('one-time contribution', () => {
    cy.intercept(
      { method: 'POST', url: getEndpoint(AUTHORIZE_ONE_TIME_STRIPE_PAYMENT_ROUTE) },
      {
        body: { provider_client_secret_id: 'pi_3LgkV1pOaLul7_secret_QcpIANR9d6', email_hash: 'b4170aca0fd3e60' },
        statusCode: 201
      }
    ).as('create-one-time-payment');
    cy.intercept({ method: 'POST', url: 'https://r.stripe.com/0' }, { statusCode: 201 });
    cy.intercept({ method: 'POST', url: 'https://m.stripe.com/0' }, { statusCode: 201 });
    cy.intercept({ method: 'GET', url: 'https://api.stripe.com/**' }, { statusCode: 200 });

    cy.get('[data-testid*="amount-120"]').click();
    cy.get('[data-testid*="frequency-one_time"]').click();
    fillOutDonorInfoSection();
    fillOutAddressSection();
    fillOutReasonForGiving();
    cy.get('form[name="contribution-checkout"]').submit();
    cy.wait('@create-one-time-payment');
    // assert re: what's sent to server
    cy.window()
      .its('stripe')
      .then((stripe) => {
        cy.spy(stripe, 'confirmPayment').as('stripe-confirm-payment');
      });
    // this is all we test here because otherwise, we need real Stripe client secret
    // which would require live server providing
    cy.get('form #stripe-payment-element');
    cy.get('[data-testid="donation-page-disclaimer"]');
    cy.get('form[name="stripe-payment-form"]').submit();
    cy.get('@stripe-confirm-payment').should('be.calledOnce');
  });
  specify('recurring contribution', () => {
    cy.intercept(
      { method: 'POST', url: getEndpoint(AUTHORIZE_STRIPE_SUBSCRIPTION_ROUTE) },
      {
        body: { provider_client_secret_id: 'pi_3LgkV1pOaLul7_secret_QcpIANR9d6', email_hash: 'b4170aca0fd3e60' },
        statusCode: 201
      }
    ).as('create-subscription-payment');
    cy.intercept({ method: 'POST', url: 'https://r.stripe.com/0' }, { statusCode: 201 });
    cy.intercept({ method: 'POST', url: 'https://m.stripe.com/0' }, { statusCode: 201 });
    cy.intercept({ method: 'GET', url: 'https://api.stripe.com/**' }, { statusCode: 200 });

    cy.get('[data-testid*="amount-120"]').click();
    cy.get('[data-testid*="frequency-month"]').click();
    fillOutDonorInfoSection();
    fillOutAddressSection();
    fillOutReasonForGiving();
    cy.get('form[name="contribution-checkout"]').submit();
    cy.wait('@create-subscription-payment');
    // assert re: what's sent to server
    cy.window()
      .its('stripe')
      .then((stripe) => {
        cy.spy(stripe, 'confirmPayment').as('stripe-confirm-payment');
      });
    // this is all we test here because otherwise, we need real Stripe client secret
    // which would require live server providing
    // spy on stripe and see that expected next url is provided
    cy.get('form #stripe-payment-element');
    cy.get('[data-testid="donation-page-disclaimer"]');
    cy.get('form[name="stripe-payment-form"]').submit();
    cy.get('@stripe-confirm-payment').should('be.calledOnce');
  });
});

describe('User flow: unhappy paths', () => {
  beforeEach(() => cy.visitDonationPage());
  specify("Contribution doesn't validate on server", () => {
    const validationError = 'This field is required';
    cy.intercept(
      { method: 'POST', url: getEndpoint(AUTHORIZE_ONE_TIME_STRIPE_PAYMENT_ROUTE) },
      {
        body: {
          first_name: validationError,
          last_name: validationError,
          email: validationError,
          mailing_street: validationError,
          mailing_postal_code: validationError,
          mailing_state: validationError,
          mailing_city: validationError,
          mailing_country: validationError,
          phone: validationError,
          amount: validationError
        },
        statusCode: 400
      }
    ).as('create-one-time-payment__invalid');
    cy.get('form[name="contribution-checkout"]').submit();
    cy.wait('@create-one-time-payment__invalid');
    cy.get('[data-testid="d-amount"]').contains(validationError);
    cy.get('[data-testid="errors-First name"]').contains(validationError);
    cy.get('[data-testid="errors-Last name"]').contains(validationError);
    cy.get('[data-testid="errors-Email"]').contains(validationError);
    cy.get('[data-testid="errors-Phone"]').contains(validationError);
    cy.get('[data-testid="errors-Address"]').contains(validationError);
    cy.get('[data-testid="errors-City"]').contains(validationError);
    cy.get('[data-testid="errors-State"]').contains(validationError);
    cy.get('[data-testid="errors-Zip/Postal code"]').contains(validationError);
    cy.get('[data-testid="errors-Country"]').contains(validationError);
  });
  specify('Checkout form submission response is a 403', () => {
    cy.intercept({ method: 'POST', url: getEndpoint(AUTHORIZE_ONE_TIME_STRIPE_PAYMENT_ROUTE) }, { statusCode: 403 }).as(
      'create-one-time-payment__unauthorized'
    );
    cy.get('form[name="contribution-checkout"]').submit();
    cy.wait('@create-one-time-payment__unauthorized');
    cy.get('[data-testid="500-something-wrong"]');
  });
});

describe('Payment success page', () => {
  // spy on analytics track conversion
  // spy on api call success
  // confirm next url is as expected (params)
  beforeEach(() => {});
  specify('Using default thank you page', () => {});
  specify('Using off-site thank you page', () => {});
});
