// FIXME in DEV-3494
/* eslint-disable cypress/unsafe-to-chain-command */

import { LIVE_PAGE_DETAIL, AUTHORIZE_STRIPE_PAYMENT_ROUTE } from 'ajax/endpoints';
import { PAYMENT_SUCCESS } from 'routes';
import { getEndpoint, getPageElementByType, getTestingDonationPageUrl, EXPECTED_RP_SLUG } from '../support/util';
import livePageOne from '../fixtures/pages/live-page-1.json';

// Constants
import { CLEARBIT_SCRIPT_SRC } from '../../src/hooks/useClearbit';
import { CONTRIBUTION_INTERVALS } from '../../src/constants/contributionIntervals';

import calculateStripeFee from 'utilities/calculateStripeFee';
import formatStringAmountForDisplay from 'utilities/formatStringAmountForDisplay';
import { DEFAULT_BACK_BUTTON_TEXT } from 'components/common/Button/BackButton/BackButton';

const pageSlug = 'page-slug';
const expectedPageSlug = `${pageSlug}/`;

function getFeesCheckbox() {
  return cy.get('[data-testid="pay-fees"] input[type="checkbox"]');
}

const mapFrequencyValueToDisplayName = {
  one_time: 'One-time',
  month: 'Monthly',
  year: 'Yearly'
};

function expectedPaymentSuccessUrl(props) {
  const url = new URL('/payment/success/', props.baseUrl);

  url.search = new URLSearchParams({
    pageSlug: props.pageSlug,
    rpSlug: props.rpSlug,
    amount: props.amount.toString(),
    email: props.contributorEmail,
    frequency: props.frequencyDisplayValue,
    fromPath: props.pathName === '/' ? '' : props.pathName,
    next: props.thankYouRedirectUrl,
    uid: props.emailHash
  }).toString();

  return url.href;
}

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

  it('should render expected expected frequencies', () => {
    const frequency = getPageElementByType(livePageOne, 'DFrequency');
    cy.getByTestId('d-frequency');
    frequency.content.forEach((freq) => cy.contains(mapFrequencyValueToDisplayName[freq.value]));
  });

  it('should render text indicating expected frequencies', () => {
    const expectedSuffixes = {
      month: '/month',
      year: '/year'
    };
    const frequency = getPageElementByType(livePageOne, 'DFrequency');

    cy.getByTestId('d-amount');

    for (const freq of frequency.content) {
      cy.contains(mapFrequencyValueToDisplayName[freq.value]).click();
      cy.getByTestId('d-amount').find('h2').contains(mapFrequencyValueToDisplayName[freq.value]);
      cy.getByTestId('pay-fees')
        .scrollIntoView()
        .find('label')
        .contains(mapFrequencyValueToDisplayName[freq.value], { matchCase: false });

      if (freq in expectedSuffixes) {
        cy.getByTestId('custom-amount-rate').contains(expectedSuffixes[freq]);
      }
    }
  });

  it('should render the correct fee based on frequency and amount', () => {
    const frequency = getPageElementByType(livePageOne, 'DFrequency');
    const amounts = getPageElementByType(livePageOne, 'DAmount');

    frequency.content.forEach((freq) => {
      cy.contains(mapFrequencyValueToDisplayName[freq.value]).click();
      amounts.content.options[freq.value].forEach((amount) => {
        cy.contains(amount).click();
        const calculatedFee = calculateStripeFee(amount, freq.value, true);
        cy.getByTestId('pay-fees').scrollIntoView().find('label').contains(formatStringAmountForDisplay(calculatedFee));
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
    getFeesCheckbox().should('be.checked');
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
    getFeesCheckbox().should('not.be.checked');
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

  specify('selects the default amount if user changes frequency after filling other amount', () => {
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

    // Change frequency
    cy.get('[data-testid*="frequency-one_time"]').click();

    // assert that components are updated
    cy.getByTestId(`amount-other-selected`).should('not.exist');
    cy.getByTestId('frequency-month-selected').should('not.exist');
    cy.getByTestId(`amount-other`).should('exist');
    cy.getByTestId(`frequency-one_time-selected`).should('exist');
    cy.getByTestId(`amount-120-selected`).should('exist');
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
    cy.getByTestId('page-error').should('exist');
  });
});

function fillOutAddressSection() {
  cy.get('[data-testid*="mailing_street"]').type('123 Main St');
  cy.findByRole('button', { name: 'Address line 2 (Apt, suite, etc.)' }).click();
  cy.get('[data-testid*="mailing_complement"]').type('Ap 1');
  cy.get('[data-testid*="mailing_city"]').type('Big City');
  cy.get('[data-testid*="mailing_state"]').type('NY');
  cy.get('[data-testid*="mailing_postal_code"]').type('100738');
  cy.findByRole('button', { name: 'Open' }).click();
  cy.findByRole('option', { name: 'United States' }).click();
  cy.findByLabelText('Country').invoke('val').as('countryValue');
}

function fillOutDonorInfoSection() {
  cy.get('[data-testid*="first_name"]').type('Fred');
  cy.get('[data-testid*="last_name"]').type('Person');
  cy.get('[data-testid*="email"]').type('foo@bar.com');
  cy.findByLabelText('Phone', { exact: false }).type('212-555-5555');
}

function fillOutReasonForGiving() {
  cy.get('[data-testid="reason-for-giving-reason-select"]').click();
  cy.findByRole('option', { name: 'test1' }).click();
  cy.get('[data-testid="reason-for-giving-reason-select"]').invoke('val').as('reasonValue');
}

const fakeEmailHash = 'b4170aca0fd3e60';
const fakeStripeSecret = 'pi_3LgkV1pOaLul7_secret_QcpIANR9d6';
const fakeContributionUuid = 'totally-random-stuff!';

describe('User flow: happy path', () => {
  beforeEach(() => {
    cy.interceptGoogleRecaptcha();
    cy.visitDonationPage();
  });
  for (const payFees of [true, false]) {
    specify(`one-time contribution, ${payFees ? '' : 'NOT'} paying fees`, () => {
      cy.intercept(
        { method: 'POST', url: getEndpoint(AUTHORIZE_STRIPE_PAYMENT_ROUTE) },
        {
          body: { client_secret: fakeStripeSecret, email_hash: fakeEmailHash, uuid: fakeContributionUuid },
          statusCode: 201
        }
      ).as('create-one-time-payment');
      cy.interceptStripeApi();
      cy.get('[data-testid*="amount-120"]').click();
      cy.get('[data-testid*="frequency-one_time"]').click();
      fillOutDonorInfoSection();
      fillOutAddressSection();
      fillOutReasonForGiving();

      if (payFees) {
        // The contribution page fixture has fees paid by default, but make sure that's true.
        getFeesCheckbox().should('be.checked');
      } else {
        getFeesCheckbox().click();
        getFeesCheckbox().should('not.be.checked');
      }
      cy.get('form')
        .findByRole('button', { name: /Continue to Payment/ })
        .click();

      cy.wait('@create-one-time-payment').then((interception) => {
        // captcha_token is different each request, so instead of stubbing it, we just assert there's an
        // object entry for it.
        expect(Object.keys(interception.request.body).includes('captcha_token')).to.be.true;
        const { captcha_token, ...allButCaptcha } = interception.request.body;
        expect(allButCaptcha).to.deep.include({
          agreed_to_pay_fees: payFees,
          interval: CONTRIBUTION_INTERVALS.ONE_TIME,
          amount: payFees ? '123.01' : '120',
          first_name: 'Fred',
          last_name: 'Person',
          email: 'foo@bar.com',
          phone: '212-555-5555',
          mailing_complement: 'Ap 1',
          mailing_city: 'Big City',
          mailing_state: 'NY',
          mailing_postal_code: '100738',
          mailing_country: 'US',
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
      cy.findByRole('button', {
        name: payFees ? 'Give 🍁123.01 CAD once' : 'Give 🍁120.00 CAD once'
      }).click();
      cy.get('@stripe-confirm-payment').should((x) => {
        expect(x).to.be.calledOnce;
        const {
          confirmParams: { return_url }
        } = x.getCalls()[0].args[0];

        expect(return_url).to.equal(
          expectedPaymentSuccessUrl({
            baseUrl: 'http://revenueprogram.revengine-testabc123.com:3000/',
            thankYouRedirectUrl: '',
            amount: payFees ? '123.01' : '120',
            emailHash: fakeEmailHash,
            frequencyDisplayValue: 'one-time',
            contributorEmail: 'foo@bar.com',
            pageSlug: livePageOne.slug,
            rpSlug: livePageOne.revenue_program.slug,
            pathName: `/${livePageOne.slug}/`
          })
        );
      });
    });
  }

  for (const clientSecret of [
    'seti_1KeMErBMAMOLTEaknWFzrq7y_secret_LL2JukSY3r0pGTkgTE9J988dwdHeblI',
    'pi_1HHdLcBMAMOLTEakcvsdf50i_secret_LHiELXtyVQy8JZizeruGD8V1M'
  ]) {
    specify(`recurring contribution when \`clientSecret\` begins with ${clientSecret}`, () => {
      cy.intercept(
        { method: 'POST', url: getEndpoint(AUTHORIZE_STRIPE_PAYMENT_ROUTE) },
        {
          body: { client_secret: clientSecret, email_hash: fakeEmailHash, uuid: fakeContributionUuid },
          statusCode: 201
        }
      ).as('create-recurring-payment');
      cy.intercept({ method: 'POST', url: 'https://r.stripe.com/0' }, { statusCode: 201 });
      cy.intercept({ method: 'POST', url: 'https://m.stripe.com/0' }, { statusCode: 201 });
      cy.intercept({ method: 'GET', url: 'https://api.stripe.com/**' }, { statusCode: 200 });
      cy.get('[data-testid*="frequency-month"]').click();
      fillOutDonorInfoSection();
      fillOutAddressSection();
      fillOutReasonForGiving();
      cy.get('form')
        .findByRole('button', { name: /Continue to Payment/ })
        .click();
      cy.wait('@create-recurring-payment');

      cy.window()
        .its('stripe')
        .then((stripe) => {
          cy.spy(stripe, clientSecret.startsWith('seti_') ? 'confirmSetup' : 'confirmPayment').as('stripe-confirm');
        });

      cy.findByRole('button', {
        name: 'Give 🍁10.53 CAD monthly'
      }).click();

      cy.get('@stripe-confirm').should((x) => {
        expect(x).to.be.calledOnce;
      });
    });
  }

  for (const payFees of [true, false]) {
    specify(`recurring contribution, ${payFees ? '' : 'NOT'} paying fees`, () => {
      cy.intercept(
        { method: 'POST', url: getEndpoint(AUTHORIZE_STRIPE_PAYMENT_ROUTE) },
        {
          body: {
            client_secret: 'pi_3LgkV1pOaLul7_secret_QcpIANR9d6',
            email_hash: fakeEmailHash,
            uuid: fakeContributionUuid
          },
          statusCode: 201
        }
      ).as('create-subscription-payment');
      cy.interceptStripeApi();

      cy.get('[data-testid*="frequency-month"]').click();
      fillOutDonorInfoSection();
      fillOutAddressSection();
      fillOutReasonForGiving();

      if (payFees) {
        // The contribution page fixture has fees paid by default, but make sure that's true.
        getFeesCheckbox().should('be.checked');
      } else {
        getFeesCheckbox().click();
        getFeesCheckbox().should('not.be.checked');
      }
      cy.get('form')
        .findByRole('button', { name: /Continue to Payment/ })
        .click();
      cy.wait('@create-subscription-payment').then((interception) => {
        // captcha_token is different each request, so instead of stubbing it, we just assert there's an
        // object entry for it.
        expect(Object.keys(interception.request.body).includes('captcha_token')).to.be.true;
        const { captcha_token, ...allButCaptcha } = interception.request.body;
        expect(allButCaptcha).to.deep.include({
          interval: CONTRIBUTION_INTERVALS.MONTHLY,
          agreed_to_pay_fees: payFees,
          amount: payFees ? '10.53' : '10',
          first_name: 'Fred',
          last_name: 'Person',
          email: 'foo@bar.com',
          phone: '212-555-5555',
          mailing_complement: 'Ap 1',
          mailing_city: 'Big City',
          mailing_state: 'NY',
          mailing_postal_code: '100738',
          mailing_country: 'US',
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
      cy.findByRole('button', {
        name: payFees ? 'Give 🍁10.53 CAD monthly' : 'Give 🍁10.00 CAD monthly'
      }).click();
      cy.get('@stripe-confirm-payment').should((x) => {
        expect(x).to.be.calledOnce;
        const {
          confirmParams: { return_url }
        } = x.getCalls()[0].args[0];

        expect(return_url).to.equal(
          expectedPaymentSuccessUrl({
            baseUrl: 'http://revenueprogram.revengine-testabc123.com:3000/',
            thankYouRedirectUrl: '',
            amount: payFees ? '10.53' : '10',
            emailHash: fakeEmailHash,
            frequencyDisplayValue: 'monthly',
            contributorEmail: 'foo@bar.com',
            pageSlug: livePageOne.slug,
            rpSlug: livePageOne.revenue_program.slug,
            pathName: `/${livePageOne.slug}/`
          })
        );
      });
    });
  }

  specify('Via default donation page', () => {
    cy.intercept(
      { method: 'POST', url: getEndpoint(AUTHORIZE_STRIPE_PAYMENT_ROUTE) },
      {
        body: {
          client_secret: 'pi_3LgkV1pOaLul7_secret_QcpIANR9d6',
          email_hash: fakeEmailHash,
          uuid: fakeContributionUuid
        },
        statusCode: 201
      }
    ).as('create-subscription-payment');
    cy.interceptStripeApi();

    cy.visitDefaultDonationPage();
    cy.get('[data-testid*="frequency-month"]').click();
    fillOutDonorInfoSection();
    fillOutAddressSection();
    fillOutReasonForGiving();
    cy.get('form')
      .findByRole('button', { name: /Continue to Payment/ })
      .click();

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

    cy.findByRole('button', {
      name: 'Give 🍁10.53 CAD monthly'
    }).click();

    cy.get('@stripe-confirm-payment').should((x) => {
      expect(x).to.be.calledOnce;
      const {
        confirmParams: { return_url }
      } = x.getCalls()[0].args[0];
      expect(return_url).to.equal(
        expectedPaymentSuccessUrl({
          baseUrl: 'http://revenueprogram.revengine-testabc123.com:3000/',
          thankYouRedirectUrl: '',
          amount: '10.53',
          emailHash: fakeEmailHash,
          frequencyDisplayValue: 'monthly',
          contributorEmail: 'foo@bar.com',
          pageSlug: livePageOne.slug,
          rpSlug: livePageOne.revenue_program.slug,
          pathName: ''
        })
      );
    });
  });

  specify.only('Double-clicking submit button', () => {
    cy.intercept(
      { method: 'POST', url: getEndpoint(AUTHORIZE_STRIPE_PAYMENT_ROUTE) },
      {
        body: {
          client_secret: 'pi_3LgkV1pOaLul7_secret_QcpIANR9d6',
          email_hash: fakeEmailHash,
          uuid: fakeContributionUuid
        },
        statusCode: 201
      }
    ).as('create-subscription-payment');
    cy.interceptStripeApi();

    cy.visitDefaultDonationPage();
    cy.get('[data-testid*="frequency-month"]').click();
    fillOutDonorInfoSection();
    fillOutAddressSection();
    fillOutReasonForGiving();
    cy.get('form')
      .findByRole('button', { name: /Continue to Payment/ })
      .dblclick();

    // Wait on the modal to appear, not the POST request, to try to collect any
    // extraneous requests.

    cy.get('form #stripe-payment-element');
    cy.get('@create-subscription-payment.all').should('have.length', 1);
  });
});

describe('User flow: canceling contribution', () => {
  beforeEach(() => {
    cy.interceptGoogleRecaptcha();
    cy.visitDonationPage();
  });

  specify('happy path', () => {
    cy.intercept(
      { method: 'POST', url: getEndpoint(AUTHORIZE_STRIPE_PAYMENT_ROUTE) },
      {
        body: { client_secret: fakeStripeSecret, email_hash: fakeEmailHash, uuid: fakeContributionUuid },
        statusCode: 201
      }
    ).as('create-subscription-payment');
    cy.intercept(
      { method: 'DELETE', url: getEndpoint(`${AUTHORIZE_STRIPE_PAYMENT_ROUTE}${fakeContributionUuid}/`) },
      { statusCode: 204 }
    ).as('cancel-payment');
    cy.interceptStripeApi();
    cy.get('[data-testid*="frequency-month"]').click();
    fillOutDonorInfoSection();
    fillOutAddressSection();

    fillOutReasonForGiving();
    const frequencyLabel = 'Monthly';
    // we assert checked before submission so can check after that has same val
    cy.findAllByLabelText(frequencyLabel).should('be.checked');

    getFeesCheckbox().should('be.checked');

    cy.get('form')
      .findByRole('button', { name: /Continue to Payment/ })
      .click();

    cy.wait('@create-subscription-payment');
    cy.findByRole('button', { name: DEFAULT_BACK_BUTTON_TEXT }).click();
    cy.wait('@cancel-payment');

    // here we show that previous form values still in place when sent back to initial form
    cy.findByLabelText('First name', { exact: false }).should('have.value', 'Fred');
    cy.findByLabelText('Last name', { exact: false }).should('have.value', 'Person');
    cy.findByLabelText('Email', { exact: false }).should('have.value', 'foo@bar.com');
    cy.findByLabelText('Phone', { exact: false }).should('have.value', '212-555-5555');
    cy.findByLabelText('Address', { exact: false }).should('have.value', '123 Main St');
    cy.findByLabelText('City', { exact: false }).should('have.value', 'Big City');
    cy.findByLabelText('State', { exact: false }).should('have.value', 'NY');
    cy.findByLabelText('Zip/Postal code', { exact: false }).should('have.value', '100738');
    cy.get('@countryValue').then((country) => {
      cy.findByLabelText('Country')
        .invoke('val')
        .then((val) => {
          expect(val).to.equal(country);
        });
    });
    cy.findAllByLabelText(frequencyLabel).should('be.checked');
    getFeesCheckbox().should('be.checked');
    cy.get('@reasonValue').then((reason) => {
      cy.getByTestId('reason-for-giving-reason-select').should('have.value', reason);
    });
  });

  specify('double-clicking the cancel button', () => {
    cy.intercept(
      { method: 'POST', url: getEndpoint(AUTHORIZE_STRIPE_PAYMENT_ROUTE) },
      {
        body: { client_secret: fakeStripeSecret, email_hash: fakeEmailHash, uuid: fakeContributionUuid },
        statusCode: 201
      }
    ).as('create-subscription-payment');
    cy.intercept(
      { method: 'DELETE', url: getEndpoint(`${AUTHORIZE_STRIPE_PAYMENT_ROUTE}${fakeContributionUuid}/`) },
      { statusCode: 204 }
    ).as('cancel-payment');
    cy.interceptStripeApi();
    cy.get('[data-testid*="frequency-month"]').click();
    fillOutDonorInfoSection();
    fillOutAddressSection();
    fillOutReasonForGiving();
    cy.get('form')
      .findByRole('button', { name: /Continue to Payment/ })
      .click();
    cy.wait('@create-subscription-payment');
    cy.findByRole('button', { name: DEFAULT_BACK_BUTTON_TEXT }).dblclick();
    cy.wait('@cancel-payment');

    // Test that we're able to re-do the payment.

    cy.get('form')
      .findByRole('button', { name: /Continue to Payment/ })
      .click();
    cy.wait('@create-subscription-payment');
    cy.window()
      .its('stripe')
      .then((stripe) => cy.spy(stripe, 'confirmPayment').as('stripe-confirm-payment'));
    cy.get('form #stripe-payment-element');
    cy.findByRole('button', { name: 'Give 🍁10.53 CAD monthly' }).click();
    cy.get('@stripe-confirm-payment').should((x) => expect(x).to.be.calledOnce);
  });

  specify('when API request to cancel payment fails', () => {
    cy.intercept(
      { method: 'POST', url: getEndpoint(AUTHORIZE_STRIPE_PAYMENT_ROUTE) },
      {
        body: { client_secret: fakeStripeSecret, email_hash: fakeEmailHash, uuid: fakeContributionUuid },
        statusCode: 201
      }
    ).as('create-subscription-payment');
    cy.intercept(
      { method: 'DELETE', url: getEndpoint(`${AUTHORIZE_STRIPE_PAYMENT_ROUTE}${fakeContributionUuid}`) },
      { statusCode: 500 }
    ).as('cancel-payment');
    cy.interceptStripeApi();
    cy.get('[data-testid*="frequency-month"]').click();
    fillOutDonorInfoSection();
    fillOutAddressSection();

    cy.findByLabelText('Country').invoke('val').as('countryValue');
    fillOutReasonForGiving();
    const frequencyLabel = 'Monthly';
    // we assert checked before submission so can check after that has same val
    cy.findAllByLabelText(frequencyLabel).should('be.checked');
    getFeesCheckbox().should('be.checked');

    cy.get('form')
      .findByRole('button', { name: /Continue to Payment/ })
      .click();
    cy.wait('@create-subscription-payment');
    cy.findByRole('button', { name: DEFAULT_BACK_BUTTON_TEXT }).click();
    cy.wait('@cancel-payment');
    cy.contains("Something went wrong, but don't worry, you haven't been charged. Try refreshing.");
  });
});

describe('User flow: unhappy paths', () => {
  beforeEach(() => {
    cy.interceptGoogleRecaptcha();
  });

  // We fill in the form fully in these tests because address fields are marked
  // as required, and will block form submission otherwise.

  specify("Contribution doesn't validate on server", () => {
    const validationError = 'This field is required';
    cy.intercept(
      { method: 'POST', url: getEndpoint(AUTHORIZE_STRIPE_PAYMENT_ROUTE) },
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
    fillOutDonorInfoSection();
    fillOutAddressSection();
    cy.get('form')
      .findByRole('button', { name: /Continue to Payment/ })
      .click();
    cy.wait('@create-one-time-payment__invalid');
    cy.get('[data-testid="d-amount"]').contains(validationError);
    cy.get('#donor-info-first-name-helper-text').contains(validationError);
    cy.get('#donor-info-last-name-helper-text').contains(validationError);
    cy.get('#donor-info-email-helper-text').contains(validationError);
    cy.get('#donor-info-phone-helper-text').contains(validationError);
    cy.get('#mailing_street-helper-text').contains(validationError);
    cy.get('#mailing_city-helper-text').contains(validationError);
    cy.get('#mailing_state-helper-text').contains(validationError);
    cy.get('#mailing_postal_code-helper-text').contains(validationError);
    cy.get('#country-helper-text').contains(validationError);
  });

  specify('Checkout form submission response is a 403', () => {
    cy.intercept({ method: 'POST', url: getEndpoint(AUTHORIZE_STRIPE_PAYMENT_ROUTE) }, { statusCode: 403 }).as(
      'create-one-time-payment__unauthorized'
    );
    cy.visitDonationPage();
    fillOutDonorInfoSection();
    fillOutAddressSection();
    cy.get('form')
      .findByRole('button', { name: /Continue to Payment/ })
      .click();
    cy.wait('@create-one-time-payment__unauthorized');
    cy.get('[data-testid="live-error-fallback"]');
  });

  specify('User enters single character into country field, then hits enter', () => {
    cy.visitDonationPage();
    fillOutDonorInfoSection();
    cy.get('[data-testid*="mailing_street"]').type('123 Main St');
    cy.findByRole('button', { name: 'Address line 2 (Apt, suite, etc.)' }).click();
    cy.get('[data-testid*="mailing_complement"]').type('Ap 1');
    cy.get('[data-testid*="mailing_city"]').type('Big City');
    cy.get('[data-testid*="mailing_state"]').type('NY');
    cy.get('[data-testid*="mailing_postal_code"]').type('100738');
    cy.get('#country').type('a{enter}');
    cy.get('[data-testid="live-error-fallback"]').should('not.exist');
  });
});

describe('StripePaymentForm unhappy paths', () => {
  beforeEach(() => {
    cy.interceptGoogleRecaptcha();
    cy.interceptStripeApi();
    cy.intercept(
      { method: 'POST', url: getEndpoint(AUTHORIZE_STRIPE_PAYMENT_ROUTE) },
      {
        body: { client_secret: fakeStripeSecret, email_hash: fakeEmailHash, uuid: 'some-uuid' },
        statusCode: 201
      }
    ).as('create-one-time-payment');
    cy.visitDonationPage();
    cy.get('[data-testid*="amount-120"]').click();
    cy.get('[data-testid*="frequency-one_time"]').click();
    fillOutDonorInfoSection();
    fillOutAddressSection();
    fillOutReasonForGiving();
    cy.get('form').findByRole('button', { name: 'Continue to Payment' }).click();
    cy.wait('@create-one-time-payment');
  });
  for (const errorType of ['card_error', 'validation_error']) {
    const errorMessage = 'Some message';
    specify(`displays Stripe's error message when an error with type ${errorType} occurs`, () => {
      cy.window()
        .its('stripe')
        .then((stripe) => {
          cy.stub(stripe, 'confirmPayment').resolves({ error: { type: errorType, message: errorMessage } });
        });
      cy.findByRole('button', {
        name: 'Give 🍁123.01 CAD once'
      }).click();
      cy.findByRole('alert').within(() => {
        cy.contains(errorMessage).should('be.visible');
      });
    });
  }
  specify(
    'displays an error when there is an unexpected error, but the Stripe payment element submission payment promise resolved',
    () => {
      cy.window()
        .its('stripe')
        .then((stripe) => {
          cy.stub(stripe, 'confirmPayment').resolves({ error: { type: 'unexpected' } });
        });
      cy.findByRole('button', {
        name: 'Give 🍁123.01 CAD once'
      }).click();
      cy.findByRole('alert').within(() => {
        cy.contains('Something went wrong processing your payment').should('be.visible');
      });
    }
  );
  specify('displays an error when an unexpected, non-promise error on Stripe payment element submission occurs', () => {
    cy.window()
      .its('stripe')
      .then((stripe) => {
        cy.stub(stripe, 'confirmPayment').rejects(new Error('Unexpected'));
      });
    cy.findByRole('button', {
      name: 'Give 🍁123.01 CAD once'
    }).click();
    cy.findByRole('alert').within(() => {
      cy.contains('Something went wrong processing your payment').should('be.visible');
    });
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
  contributionUuid: fakeContributionUuid
};

describe('Payment success page', () => {
  beforeEach(() => {
    cy.intercept(
      { method: 'GET', pathname: getEndpoint(LIVE_PAGE_DETAIL) },
      { fixture: 'pages/live-page-1', statusCode: 200 }
    ).as('getPageDetail');
    // this appears to be a request that gets triggered by the facebook pixel instance. Sometimes unintercepted response was successful,
    // and other times it was not, which would cause test to intermittently break. Now, we intercept and pretend like FB sends 200 to ensure
    // tests will behave.
    cy.interceptFbAnalytics();
  });

  specify('Using default thank you page', () => {
    cy.visit(paymentSuccessRoute, { qs: successPageQueryParams });
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
    // get forwarded to right destination
    cy.url().should('equal', `http://revenueprogram.revengine-testabc123.com:3000/thank-you/`);
  });
});
