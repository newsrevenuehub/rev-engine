import { STRIPE_PAYMENT, LIVE_PAGE_DETAIL } from 'ajax/endpoints';
import { getEndpoint, getPageElementByType, getTestingDonationPageUrl, EXPECTED_RP_SLUG } from '../support/util';
import livePageOne from '../fixtures/pages/live-page-1.json';

// Deps
import { format } from 'date-fns';

// Constants
import { CLEARBIT_SCRIPT_SRC } from '../../src/hooks/useClearbit';
import { FUNDJOURNALISM_404_REDIRECT } from 'components/donationPage/live/LivePage404';

import * as freqUtils from 'utilities/parseFrequency';
import calculateStripeFee from 'utilities/calculateStripeFee';

const expectedPageSlug = 'page-slug';

// this is an absurdly long wait time, but BW has watched tests run with cypress open and has seen
// the stripe API calls take this long to return.
const LONG_WAIT = 30000;

describe('Routing', () => {
  it('should send a request containing the correct query params', () => {
    cy.intercept({ method: 'GET', pathname: getEndpoint(LIVE_PAGE_DETAIL) }, (req) => {
      expect(req.url).contains(`revenue_program=${EXPECTED_RP_SLUG}`);
      expect(req.url).contains(`page=${expectedPageSlug}`);
    });
    cy.visit(getTestingDonationPageUrl(expectedPageSlug));
  });

  it('should show a donation page if route is not reserved, first-level', () => {
    cy.intercept('/api/v1/organizations/stripe_account_id/**', { fixture: 'stripe/org-account-id.json' });
    cy.intercept(
      { method: 'GET', pathname: getEndpoint(LIVE_PAGE_DETAIL) },
      { fixture: 'pages/live-page-1', statusCode: 200 }
    ).as('getPageDetail');
    cy.visit(getTestingDonationPageUrl(expectedPageSlug));
    cy.wait('@getPageDetail');
    cy.getByTestId('donation-page').should('exist');
    cy.get('head').find(`script[src*="${CLEARBIT_SCRIPT_SRC}"]`).should('have.length', 1);
  });

  it('404 should display a link to fundjournalism.org in the text "this page"', () => {
    cy.intercept({ method: 'GET', pathname: getEndpoint(LIVE_PAGE_DETAIL) }, { statusCode: 404 }).as('getPageDetail');
    cy.visit(getTestingDonationPageUrl(expectedPageSlug));
    cy.wait('@getPageDetail');
    cy.getByTestId('live-page-404').should('exist');
    cy.get(`a[href="${FUNDJOURNALISM_404_REDIRECT}"]`).should('exist');
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
    cy.intercept(
      { method: 'GET', pathname: getEndpoint(LIVE_PAGE_DETAIL) },
      { fixture: 'pages/live-page-1.json', statusCode: 200 }
    ).as('getPage');
    cy.visit(getTestingDonationPageUrl(expectedPageSlug));
    cy.url().should('include', EXPECTED_RP_SLUG);
    cy.url().should('include', expectedPageSlug);
    cy.wait('@getPage');

    cy.getByTestId('d-swag').should('exist');
  });

  it('should render swag options if swagThreshold is met', () => {
    const swagElement = livePageOne.elements.find((el) => el.type === 'DSwag');
    const swagThreshold = swagElement.content.swagThreshold;
    cy.contains(`Give a total of ${livePageOne.currency.symbol}${swagThreshold} /year or more to be eligible`);
    cy.getByTestId('swag-content').should('not.exist');
    cy.setUpDonation('One time', '365');
    cy.getByTestId('swag-content').should('exist');
  });

  it('should render a dropdown of swagOptions for each swag in the list', () => {
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

  it('should not show nyt comp subscription option if enabled', () => {
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
    const amounts = livePageOne.elements.find((el) => el.type === 'DAmount');

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
    amounts.content.options.one_time.forEach((amount) => {
      cy.getByTestId(`amount-${amount}`).should('not.exist');
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
  it('should show 404 if request live page returns non-200', () => {
    cy.intercept(
      { method: 'GET', pathname: getEndpoint(LIVE_PAGE_DETAIL) },
      { fixture: 'pages/live-page-1', statusCode: 404 }
    ).as('getLivePage');
    cy.visit(getTestingDonationPageUrl(expectedPageSlug));
    cy.url().should('include', EXPECTED_RP_SLUG);
    cy.url().should('include', expectedPageSlug);
    cy.wait('@getLivePage');
    cy.getByTestId('live-page-404').should('exist');
  });

  it('should show live 404 page if api returns 404', () => {
    cy.intercept({ method: 'GET', pathname: getEndpoint(LIVE_PAGE_DETAIL) }, { statusCode: 404 }).as('getPageDetail');
    cy.visit(getTestingDonationPageUrl(expectedPageSlug));
    cy.wait('@getPageDetail');
    cy.getByTestId('live-page-404').should('exist');
  });

  it('should show a donation page if route is not reserved', () => {
    cy.intercept(
      { method: 'GET', pathname: getEndpoint(LIVE_PAGE_DETAIL) },
      { fixture: 'pages/live-page-1', statusCode: 200 }
    ).as('getPageDetail');
    cy.visit(getTestingDonationPageUrl(expectedPageSlug));
    cy.wait('@getPageDetail');
    cy.getByTestId('donation-page').should('exist');
  });
});

describe('Footer-like content', () => {
  before(() => {
    cy.intercept(
      { method: 'GET', pathname: getEndpoint(LIVE_PAGE_DETAIL) },
      { fixture: 'pages/live-page-1', statusCode: 200 }
    ).as('getPage');
    cy.visit(getTestingDonationPageUrl(expectedPageSlug));
    cy.url().should('include', EXPECTED_RP_SLUG);
    cy.url().should('include', expectedPageSlug);
    cy.wait('@getPage');
  });

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

describe.skip('Resulting request', () => {
  beforeEach(() => {
    cy.intercept(
      { method: 'GET', pathname: `${getEndpoint(LIVE_PAGE_DETAIL)}**` },
      { fixture: 'pages/live-page-1', statusCode: 200 }
    ).as('getPageDetail');
  });
  it('should pass salesforce campaign id from query parameter to request body', () => {
    const sfCampaignId = 'my-test-sf-campaign-id';
    cy.intercept(
      { method: 'GET', pathname: `${getEndpoint(LIVE_PAGE_DETAIL)}**` },
      { fixture: 'pages/live-page-1', statusCode: 200 }
    ).as('getPageDetail');
    cy.visit(getTestingDonationPageUrl(expectedPageSlug, `?campaign=${sfCampaignId}`));
    cy.url().should('include', EXPECTED_RP_SLUG);
    cy.url().should('include', expectedPageSlug);
    cy.url().should('include', sfCampaignId);
    cy.wait('@getPageDetail');

    const interval = 'One time';
    const amount = '120';

    cy.intercept(
      { method: 'POST', pathname: getEndpoint(STRIPE_PAYMENT) },
      { fixture: 'stripe/payment-intent', statusCode: 200 }
    ).as('stripePaymentWithSfId');
    cy.setUpDonation(interval, amount);
    cy.makeDonation().then(() => {
      cy.wait('@stripePaymentWithSfId').its('request.body').should('have.property', 'sf_campaign_id', sfCampaignId);
    });
  });

  it('should send a request with the expected payment properties and values', () => {
    cy.intercept(
      { method: 'GET', pathname: `${getEndpoint(LIVE_PAGE_DETAIL)}**` },
      { fixture: 'pages/live-page-1', statusCode: 200 }
    ).as('getPageDetail');
    cy.visit(getTestingDonationPageUrl(expectedPageSlug));
    cy.url().should('include', EXPECTED_RP_SLUG);
    cy.url().should('include', expectedPageSlug);
    cy.wait('@getPageDetail');

    cy.intercept(
      { method: 'POST', pathname: getEndpoint(STRIPE_PAYMENT) },
      { fixture: 'stripe/payment-intent', statusCode: 200 }
    ).as('stripePaymentWithProperties');
    const interval = 'One time';
    const amount = '120';
    cy.setUpDonation(interval, amount);
    cy.makeDonation().then(() => {
      cy.wait('@stripePaymentWithProperties', { timeout: LONG_WAIT }).then((interception) => {
        const { body: paymentData } = interception.request;
        expect(paymentData).to.have.property('interval', 'one_time');
        expect(paymentData).to.have.property('amount', amount);
        expect(paymentData).to.have.property('captcha_token');
      });
    });
  });

  it('should send a confirmation request to Stripe with the organization stripe account id in the header', () => {
    /**
     * This tests against regressions that might cause the orgs stripe account id to not appear in the header of confirmCardPayment
     */
    cy.intercept(
      { method: 'GET', pathname: `${getEndpoint(LIVE_PAGE_DETAIL)}**` },
      { fixture: 'pages/live-page-1', statusCode: 200 }
    ).as('getPageDetail');
    cy.visit(getTestingDonationPageUrl(expectedPageSlug));
    cy.url().should('include', EXPECTED_RP_SLUG);
    cy.url().should('include', expectedPageSlug);
    cy.wait('@getPageDetail');

    cy.intercept(
      { method: 'POST', pathname: getEndpoint(STRIPE_PAYMENT) },
      { fixture: 'stripe/payment-intent', statusCode: 200 }
    );
    cy.intercept('/v1/payment_intents/**', { statusCode: 200 }).as('confirmCardPaymentWithAccountId');

    const interval = 'One time';
    const amount = '120';
    cy.setUpDonation(interval, amount);
    cy.makeDonation();
    cy.wait('@confirmCardPaymentWithAccountId').its('request.body').should('include', livePageOne.stripe_account_id);
  });

  it('should contain clearbit.js script in body', () => {
    cy.get('head').find(`script[src*="${CLEARBIT_SCRIPT_SRC}"]`).should('have.length', 1);
  });
});

// This test is put in a separate describe because it needs a distinct intercept
// for STRIPE_PAYMENT endpoint, vs. the test in the previous describe and cypress
// does not provide a way to override on per-test basis.
describe.skip('Resulting request: special case -- error on submission', () => {
  it('should focus the first input on the page with an error', () => {
    cy.intercept(
      { method: 'GET', pathname: `${getEndpoint(LIVE_PAGE_DETAIL)}**` },
      { fixture: 'pages/live-page-1', statusCode: 200 }
    ).as('getPageDetail');
    cy.visit(getTestingDonationPageUrl(expectedPageSlug));
    cy.wait('@getPageDetail');

    const errorElementName = 'first_name';
    const errorMessage = 'Something was wrong with first_name';
    cy.intercept(
      { method: 'POST', pathname: getEndpoint(STRIPE_PAYMENT) },
      { body: { [errorElementName]: errorMessage }, statusCode: 400 }
    ).as('stripePaymentError');
    cy.intercept('/v1/payment_intents/**', { statusCode: 200 });
    cy.intercept('/v1/payment_methods/**', { fixture: 'stripe/payment-method', statusCode: 200 });
    cy.setUpDonation('One time', '120');
    cy.makeDonation().then(() => {
      cy.wait('@stripePaymentError');
      cy.get(`input[name="${errorElementName}"]`).should('have.focus');
      cy.contains(errorMessage);
    });
  });
});

describe('Thank you page', () => {
  it('should show a generic Thank You page at /rev-slug/thank-you', () => {
    cy.intercept(
      { method: 'GET', pathname: getEndpoint(LIVE_PAGE_DETAIL) },
      { fixture: 'pages/live-page-1', statusCode: 200 }
    );
    cy.visit(getTestingDonationPageUrl('page-slug/thank-you'));
    cy.getByTestId('generic-thank-you').should('exist');
  });
});
