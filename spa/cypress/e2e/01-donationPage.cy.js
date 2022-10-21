import {
  LIVE_PAGE_DETAIL,
  AUTHORIZE_ONE_TIME_STRIPE_PAYMENT_ROUTE,
  AUTHORIZE_STRIPE_SUBSCRIPTION_ROUTE
} from 'ajax/endpoints';
import { PAYMENT_SUCCESS } from 'routes';
import { getPaymentSuccessUrl } from 'components/paymentProviders/stripe/stripeFns';
import { getEndpoint, getPageElementByType, getTestingDonationPageUrl, EXPECTED_RP_SLUG } from '../support/util';
import livePageOne from '../fixtures/pages/live-page-1.json';

// Constants
import { CLEARBIT_SCRIPT_SRC } from '../../src/hooks/useClearbit';
import { CONTRIBUTION_INTERVALS } from '../../src/constants/contributionIntervals';

import * as freqUtils from 'utilities/parseFrequency';
import calculateStripeFee from 'utilities/calculateStripeFee';

const pageSlug = 'page-slug';
const expectedPageSlug = `${pageSlug}/`;

describe('Clearbit', () => {
  it('loads clearbit', () => {
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

  it('should not select agreeToPayFees by default if appropriate page property is unset', () => {
    const page = { ...livePageOne };
    const paymentIndex = page.elements.findIndex((el) => el.type === 'DPayment');
    page.elements[paymentIndex].content.payFeesDefault = false;
    cy.intercept({ method: 'GET', pathname: getEndpoint(LIVE_PAGE_DETAIL) }, { body: page, statusCode: 200 }).as(
      'getPageWithPayFeesDefault'
    );
    cy.visit(getTestingDonationPageUrl(expectedPageSlug));
    cy.url().should('include', EXPECTED_RP_SLUG);
    cy.url().should('include', expectedPageSlug);
    cy.wait(['@getPageWithPayFeesDefault']);
    cy.getByTestId('pay-fees-checked').should('not.exist');
    cy.getByTestId('pay-fees-not-checked').should('exist');
  });

  it('should render DSwag', () => {
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

const fakeEmailHash = 'b4170aca0fd3e60';
const fakeStripeSecret = 'pi_3LgkV1pOaLul7_secret_QcpIANR9d6';

describe('User flow: happy path', () => {
  beforeEach(() => {
    // We intercept requests for Google Recaptcha because in test env, sometimes the live recaptcha returns an error
    // (possibly because we load it too many times successively???), which was causing test failure else where.
    cy.intercept({ method: 'GET', url: 'https://www.google.com/recaptcha/*' }, { statusCode: 200 });
    cy.visitDonationPage();
  });

  specify('one-time contribution, paying fees', () => {
    cy.intercept(
      { method: 'POST', url: getEndpoint(AUTHORIZE_ONE_TIME_STRIPE_PAYMENT_ROUTE) },
      {
        body: { provider_client_secret_id: fakeStripeSecret, email_hash: fakeEmailHash },
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

    // The donation page fixture has fees paid by default, but make sure that's true.

    cy.getByTestId('pay-fees-checked').should('exist');
    cy.get('form[name="contribution-checkout"]').submit();
    cy.wait('@create-one-time-payment').then((interception) => {
      // captcha_token is different each request, so instead of stubbing it, we just assert there's an
      // object entry for it.
      expect(Object.keys(interception.request.body).includes('captcha_token')).to.be.true;
      const { captcha_token, ...allButCaptcha } = interception.request.body;
      expect(allButCaptcha).to.deep.equal({
        agreed_to_pay_fees: true,
        interval: CONTRIBUTION_INTERVALS.ONE_TIME,
        amount: '123.01', // this is amount plus fee
        first_name: 'Fred',
        last_name: 'Person',
        email: 'foo@bar.com',
        phone: '',
        mailing_street: '123 Main St',
        mailing_city: 'Big City',
        mailing_state: 'NY',
        mailing_postal_code: '100738',
        mailing_country: 'AF',
        reason_for_giving: 'test1',
        tribute_type: '',
        donor_selected_amount: 120,
        page: 99
      });
      expect(interception.response.statusCode).to.equal(201);
    });
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
    cy.get('@stripe-confirm-payment').should((x) => {
      expect(x).to.be.calledOnce;
      const {
        confirmParams: { return_url }
      } = x.getCalls()[0].args[0];

      expect(return_url).to.equal(
        getPaymentSuccessUrl({
          baseUrl: 'http://revenueprogram.revengine-testabc123.com:3000/',
          thankYouRedirectUrl: '',
          amount: '123.01',
          emailHash: fakeEmailHash,
          frequencyDisplayValue: 'one-time',
          contributorEmail: 'foo@bar.com',
          pageSlug: livePageOne.slug,
          rpSlug: livePageOne.revenue_program.slug,
          pathName: `/${livePageOne.slug}/`,
          stripeClientSecret: fakeStripeSecret
        })
      );
    });
  });

  specify('one-time contribution, not paying fees', () => {
    cy.intercept(
      { method: 'POST', url: getEndpoint(AUTHORIZE_ONE_TIME_STRIPE_PAYMENT_ROUTE) },
      {
        body: { provider_client_secret_id: fakeStripeSecret, email_hash: fakeEmailHash },
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
    cy.getByTestId('pay-fees-checked').click();
    cy.getByTestId('pay-fees').should('exist');
    cy.get('form[name="contribution-checkout"]').submit();
    cy.wait('@create-one-time-payment').then((interception) => {
      // captcha_token is different each request, so instead of stubbing it, we just assert there's an
      // object entry for it.
      expect(Object.keys(interception.request.body).includes('captcha_token')).to.be.true;
      const { captcha_token, ...allButCaptcha } = interception.request.body;
      expect(allButCaptcha).to.deep.equal({
        agreed_to_pay_fees: false,
        interval: CONTRIBUTION_INTERVALS.ONE_TIME,
        amount: '120',
        first_name: 'Fred',
        last_name: 'Person',
        email: 'foo@bar.com',
        phone: '',
        mailing_street: '123 Main St',
        mailing_city: 'Big City',
        mailing_state: 'NY',
        mailing_postal_code: '100738',
        mailing_country: 'AF',
        reason_for_giving: 'test1',
        tribute_type: '',
        donor_selected_amount: 120,
        page: 99
      });
      expect(interception.response.statusCode).to.equal(201);
    });
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
    cy.get('@stripe-confirm-payment').should((x) => {
      expect(x).to.be.calledOnce;
      const {
        confirmParams: { return_url }
      } = x.getCalls()[0].args[0];

      expect(return_url).to.equal(
        getPaymentSuccessUrl({
          baseUrl: 'http://revenueprogram.revengine-testabc123.com:3000/',
          thankYouRedirectUrl: '',
          amount: '120',
          emailHash: fakeEmailHash,
          frequencyDisplayValue: 'one-time',
          contributorEmail: 'foo@bar.com',
          pageSlug: livePageOne.slug,
          rpSlug: livePageOne.revenue_program.slug,
          pathName: `/${livePageOne.slug}/`,
          stripeClientSecret: fakeStripeSecret
        })
      );
    });
  });

  specify('recurring contribution, paying fees', () => {
    cy.intercept(
      { method: 'POST', url: getEndpoint(AUTHORIZE_STRIPE_SUBSCRIPTION_ROUTE) },
      {
        body: { provider_client_secret_id: 'pi_3LgkV1pOaLul7_secret_QcpIANR9d6', email_hash: fakeEmailHash },
        statusCode: 201
      }
    ).as('create-subscription-payment');
    cy.intercept({ method: 'POST', url: 'https://r.stripe.com/0' }, { statusCode: 201 });
    cy.intercept({ method: 'POST', url: 'https://m.stripe.com/0' }, { statusCode: 201 });
    cy.intercept({ method: 'GET', url: 'https://api.stripe.com/**' }, { statusCode: 200 });

    cy.get('[data-testid*="frequency-month"]').click();
    fillOutDonorInfoSection();
    fillOutAddressSection();
    fillOutReasonForGiving();

    // The donation page fixture has fees paid by default, but make sure that's true.

    cy.getByTestId('pay-fees-checked').should('exist');
    cy.get('form[name="contribution-checkout"]').submit();
    cy.wait('@create-subscription-payment').then((interception) => {
      // captcha_token is different each request, so instead of stubbing it, we just assert there's an
      // object entry for it.
      expect(Object.keys(interception.request.body).includes('captcha_token')).to.be.true;
      const { captcha_token, ...allButCaptcha } = interception.request.body;
      expect(allButCaptcha).to.deep.equal({
        interval: CONTRIBUTION_INTERVALS.MONTHLY,
        agreed_to_pay_fees: true,
        amount: '10.53', // this default selected amount + fee
        first_name: 'Fred',
        last_name: 'Person',
        email: 'foo@bar.com',
        phone: '',
        mailing_street: '123 Main St',
        mailing_city: 'Big City',
        mailing_state: 'NY',
        mailing_postal_code: '100738',
        mailing_country: 'AF',
        reason_for_giving: 'test1',
        tribute_type: '',
        donor_selected_amount: 10,
        page: 99
      });
      expect(interception.response.statusCode).to.equal(201);
    });
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
    cy.get('@stripe-confirm-payment').should((x) => {
      expect(x).to.be.calledOnce;
      const {
        confirmParams: { return_url }
      } = x.getCalls()[0].args[0];

      expect(return_url).to.equal(
        getPaymentSuccessUrl({
          baseUrl: 'http://revenueprogram.revengine-testabc123.com:3000/',
          thankYouRedirectUrl: '',
          amount: '10.53',
          emailHash: fakeEmailHash,
          frequencyDisplayValue: 'monthly',
          contributorEmail: 'foo@bar.com',
          pageSlug: livePageOne.slug,
          rpSlug: livePageOne.revenue_program.slug,
          pathName: `/${livePageOne.slug}/`,
          stripeClientSecret: fakeStripeSecret
        })
      );
    });
  });

  specify('recurring contribution, not paying fees', () => {
    cy.intercept(
      { method: 'POST', url: getEndpoint(AUTHORIZE_STRIPE_SUBSCRIPTION_ROUTE) },
      {
        body: { provider_client_secret_id: 'pi_3LgkV1pOaLul7_secret_QcpIANR9d6', email_hash: fakeEmailHash },
        statusCode: 201
      }
    ).as('create-subscription-payment');
    cy.intercept({ method: 'POST', url: 'https://r.stripe.com/0' }, { statusCode: 201 });
    cy.intercept({ method: 'POST', url: 'https://m.stripe.com/0' }, { statusCode: 201 });
    cy.intercept({ method: 'GET', url: 'https://api.stripe.com/**' }, { statusCode: 200 });

    cy.get('[data-testid*="frequency-month"]').click();
    fillOutDonorInfoSection();
    fillOutAddressSection();
    fillOutReasonForGiving();
    cy.getByTestId('pay-fees-checked').click();
    cy.getByTestId('pay-fees').should('exist');
    cy.get('form[name="contribution-checkout"]').submit();
    cy.wait('@create-subscription-payment').then((interception) => {
      // captcha_token is different each request, so instead of stubbing it, we just assert there's an
      // object entry for it.
      expect(Object.keys(interception.request.body).includes('captcha_token')).to.be.true;
      const { captcha_token, ...allButCaptcha } = interception.request.body;
      expect(allButCaptcha).to.deep.equal({
        interval: CONTRIBUTION_INTERVALS.MONTHLY,
        agreed_to_pay_fees: false,
        amount: '10',
        first_name: 'Fred',
        last_name: 'Person',
        email: 'foo@bar.com',
        phone: '',
        mailing_street: '123 Main St',
        mailing_city: 'Big City',
        mailing_state: 'NY',
        mailing_postal_code: '100738',
        mailing_country: 'AF',
        reason_for_giving: 'test1',
        tribute_type: '',
        donor_selected_amount: 10,
        page: 99
      });
      expect(interception.response.statusCode).to.equal(201);
    });
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
    cy.get('@stripe-confirm-payment').should((x) => {
      expect(x).to.be.calledOnce;
      const {
        confirmParams: { return_url }
      } = x.getCalls()[0].args[0];

      expect(return_url).to.equal(
        getPaymentSuccessUrl({
          baseUrl: 'http://revenueprogram.revengine-testabc123.com:3000/',
          thankYouRedirectUrl: '',
          amount: '10',
          emailHash: fakeEmailHash,
          frequencyDisplayValue: 'monthly',
          contributorEmail: 'foo@bar.com',
          pageSlug: livePageOne.slug,
          rpSlug: livePageOne.revenue_program.slug,
          pathName: `/${livePageOne.slug}/`,
          stripeClientSecret: fakeStripeSecret
        })
      );
    });
  });

  specify('Via default donation page', () => {
    cy.intercept(
      { method: 'POST', url: getEndpoint(AUTHORIZE_STRIPE_SUBSCRIPTION_ROUTE) },
      {
        body: { provider_client_secret_id: 'pi_3LgkV1pOaLul7_secret_QcpIANR9d6', email_hash: fakeEmailHash },
        statusCode: 201
      }
    ).as('create-subscription-payment');
    cy.intercept({ method: 'POST', url: 'https://r.stripe.com/0' }, { statusCode: 201 });
    cy.intercept({ method: 'POST', url: 'https://m.stripe.com/0' }, { statusCode: 201 });
    cy.intercept({ method: 'GET', url: 'https://api.stripe.com/**' }, { statusCode: 200 });

    cy.visitDefaultDonationPage();
    cy.get('[data-testid*="frequency-month"]').click();
    fillOutDonorInfoSection();
    fillOutAddressSection();
    fillOutReasonForGiving();
    cy.get('form[name="contribution-checkout"]').submit();

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
    cy.get('@stripe-confirm-payment').should((x) => {
      expect(x).to.be.calledOnce;
      const {
        confirmParams: { return_url }
      } = x.getCalls()[0].args[0];
      expect(return_url).to.equal(
        getPaymentSuccessUrl({
          baseUrl: 'http://revenueprogram.revengine-testabc123.com:3000/',
          thankYouRedirectUrl: '',
          amount: '10.53',
          emailHash: fakeEmailHash,
          frequencyDisplayValue: 'monthly',
          contributorEmail: 'foo@bar.com',
          pageSlug: livePageOne.slug,
          rpSlug: livePageOne.revenue_program.slug,
          pathName: '',
          stripeClientSecret: fakeStripeSecret
        })
      );
    });
  });
});

describe('User flow: unhappy paths', () => {
  beforeEach(() => {
    // We intercept requests for Google Recaptcha because in test env, sometimes the live recaptcha returns an error
    // (possibly because we load it too many times successively???), which was causing test failure else where.
    cy.intercept({ method: 'GET', url: 'https://www.google.com/recaptcha/*' }, { statusCode: 200 });
  });
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
    cy.visitDonationPage();
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
    cy.visitDonationPage();
    cy.get('form[name="contribution-checkout"]').submit();
    cy.wait('@create-one-time-payment__unauthorized');
    cy.get('[data-testid="500-something-wrong"]');
  });

  specify("Users indicates they want to specify an amount, but doesn't specify an actual number", () => {
    cy.visitDonationPage();

    // Test various user interactions to prove that the submit button never becomes enabled and the label is correct.

    cy.getByTestId('amount-other').click();
    cy.getByTestId('donation-page-submit').should('have.attr', 'disabled');
    cy.getByTestId('donation-page-submit').should('have.text', 'Enter a valid amount');

    // Do this twice to try both states of the "pay fees" toggle.

    for (let i = 0; i < 2; i++) {
      cy.getByTestId('pay-fees').click();
      cy.getByTestId('donation-page-submit').should('have.attr', 'disabled');
      cy.getByTestId('donation-page-submit').should('have.text', 'Enter a valid amount');
    }

    cy.get('[data-testid="amount-other-selected"] input').type('3');
    cy.get('[data-testid="amount-other-selected"] input').clear();
    cy.getByTestId('donation-page-submit').should('have.attr', 'disabled');
    cy.getByTestId('donation-page-submit').should('have.text', 'Enter a valid amount');
  });
});

const paymentSuccessRoute = `http://revenueprogram.revengine-testabc123.com:3000${PAYMENT_SUCCESS}`;

const successPageQueryParams = {
  amount: '120.00',
  next: '',
  frequency: 'one-time',
  uid: fakeEmailHash,
  email: 'foo@bar.com',
  pageSlug: livePageOne.slug,
  rpSlug: livePageOne.revenue_program.slug,
  fromPath: livePageOne.slug,
  payment_intent_client_secret: fakeStripeSecret
};

describe('Payment success page', () => {
  beforeEach(() => {
    cy.intercept(
      {
        method: 'patch',
        url: `http://revenueprogram.revengine-testabc123.com:3000/api/v1/payments/${fakeStripeSecret}/success/`
      },
      { statusCode: 204 }
    ).as('signal-success');
    cy.intercept(
      { method: 'GET', pathname: getEndpoint(LIVE_PAGE_DETAIL) },
      { fixture: 'pages/live-page-1', statusCode: 200 }
    ).as('getPageDetail');
    // this appears to be a request that gets triggered by the facebook pixel instance. Sometimes unintercepted response was successful,
    // and other times it was not, which would cause test to intermittently break. Now, we intercept and pretend like FB sends 200 to ensure
    // tests will behave.
    cy.intercept({ method: 'GET', url: 'https://connect.facebook.net/*' }, { statusCode: 200 });
    cy.intercept({ method: 'GET', url: '*ev=Contribute*' }, { statusCode: 200 }).as('fbTrackContribution');
    cy.intercept({ method: 'GET', url: '*ev=Purchase*' }, { statusCode: 200 }).as('fbTrackPurchase');
  });

  specify('Using default thank you page', () => {
    cy.visit(paymentSuccessRoute, { qs: successPageQueryParams });
    cy.wait('@signal-success');
    cy.wait('@fbTrackContribution');
    cy.wait('@fbTrackPurchase').then((intercept) => {
      const params = new URLSearchParams(intercept.request.url);
      expect(params.get('cd[currency]')).to.equal('USD');
      expect(params.get('cd[value]')).to.equal('120.00');
    });
    // get forwarded to right destination
    cy.url().should('equal', `http://revenueprogram.revengine-testabc123.com:3000/${livePageOne.slug}/thank-you/`);
  });

  specify('Using off-site thank you page', () => {
    const externalThankYouPage = 'https://www.google.com';
    cy.visit(paymentSuccessRoute, { qs: { ...successPageQueryParams, next: externalThankYouPage } });
    cy.wait('@signal-success');
    cy.wait('@fbTrackContribution');
    cy.wait('@fbTrackPurchase').then((intercept) => {
      const params = new URLSearchParams(intercept.request.url);
      expect(params.get('cd[currency]')).to.equal('USD');
      expect(params.get('cd[value]')).to.equal('120.00');
    });
    // get forwarded to right destination
    cy.location().should((loc) => {
      expect(loc.origin).to.equal(externalThankYouPage);
      const searchParams = new URLSearchParams(loc.search);
      expect(searchParams.get('uid')).to.equal(successPageQueryParams.uid);
      expect(searchParams.get('frequency')).to.equal(successPageQueryParams.frequency);
      expect(searchParams.get('amount')).to.equal(successPageQueryParams.amount);
    });
  });

  specify('When coming from default donation page', () => {
    // In this case, the `fromPage` param will be empty, so we prove that redirection still works.
    // Adding this test because we had a bug whereby fromPage was `/` instead of no value. Elsewhere, we
    // unit test the function for creating the next URL that gets sent to Stripe, proving that if coming from
    // default donation page path (which will just be `/`), it sets `fromPath` to empty.
    cy.visit(paymentSuccessRoute, { qs: { ...successPageQueryParams, fromPath: '' } });
    cy.wait('@signal-success');
    // get forwarded to right destination
    cy.url().should('equal', `http://revenueprogram.revengine-testabc123.com:3000/thank-you/`);
  });
});
