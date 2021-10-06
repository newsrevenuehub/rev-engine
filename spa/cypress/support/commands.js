import { TOKEN } from 'ajax/endpoints';
import { getEndpoint, getTestingDonationPageUrl, EXPECTED_RP_SLUG } from './util';
import { LIVE_PAGE_DETAIL, STRIPE_PAYMENT, CONTRIBUTIONS } from 'ajax/endpoints';
import { DEFAULT_RESULTS_ORDERING } from 'components/donations/DonationsTable';
import { ApiResourceList } from '../support/restApi';
import donationsData from '../fixtures/donations/18-results.json';

Cypress.Commands.add('getByTestId', (testId, options, partialMatch = false) => {
  return cy.get(`[data-testid${partialMatch ? '*' : ''}="${testId}"]`, options);
});

Cypress.Commands.add('login', (userFixture) => {
  cy.clearLocalStorage();
  cy.visit('/');
  cy.getByTestId('login-email').type('test@user.com');
  cy.getByTestId('login-password').type('testing');
  cy.intercept('POST', getEndpoint(TOKEN), { fixture: userFixture }).as('login');
  cy.getByTestId('login-button').click();
  return cy.wait('@login');
});

Cypress.Commands.add('visitDonationPage', () => {
  cy.intercept(
    { method: 'GET', pathname: getEndpoint(LIVE_PAGE_DETAIL) },
    { fixture: 'pages/live-page-1', statusCode: 200 }
  ).as('getPageDetail');
  cy.visit(getTestingDonationPageUrl('my-page'));
  cy.url().should('include', EXPECTED_RP_SLUG);
  cy.url().should('include', 'my-page');
  cy.wait('@getPageDetail');
});

Cypress.Commands.add('iframeLoaded', { prevSubject: 'element' }, (iframe) => {
  const contentWindow = iframe.prop('contentWindow');
  return new Promise((resolve) => {
    if (contentWindow && contentWindow.document.readyState === 'complete') {
      resolve(contentWindow);
    } else {
      iframe.on('load', () => {
        resolve(contentWindow);
      });
    }
  });
});

Cypress.Commands.add('getInDocument', { prevSubject: 'document' }, (document, selector) =>
  Cypress.$(selector, document)
);

Cypress.Commands.add('getWithinIframe', (targetElement) =>
  cy.get('iframe').iframeLoaded().its('document').getInDocument(targetElement)
);

Cypress.Commands.add('interceptDonation', () => {
  cy.intercept(
    { method: 'POST', pathname: getEndpoint(STRIPE_PAYMENT) },
    { fixture: 'stripe/payment-intent', statusCode: 200 }
  ).as('stripePayment');

  cy.intercept('/v1/payment_intents/**', { statusCode: 200 }).as('confirmCardPayment');

  cy.intercept('/v1/payment_methods/**', { fixture: 'stripe/payment-method', statusCode: 200 }).as(
    'createPaymentMethod'
  );
});

Cypress.Commands.add('setUpDonation', (frequency, amount) => {
  cy.contains(frequency).click();
  cy.contains(amount).click();
});

Cypress.Commands.add('makeDonation', () => {
  cy.getWithinIframe('[name="cardnumber"]').type('4242424242424242');
  cy.getWithinIframe('[name="exp-date"]').type('1232');
  cy.getWithinIframe('[name="cvc"]').type('123');
  cy.getByTestId('donation-submit').click();
});

Cypress.Commands.add('interceptPaginatedDonations', () => {
  const defaultSortBys = {
    columns: DEFAULT_RESULTS_ORDERING.map((item) => item.id),
    directions: DEFAULT_RESULTS_ORDERING.map((item) => (item.desc ? 'desc' : 'asc'))
  };
  const sortableColumns = ['last_payment_date', 'amount', 'contributor_email', 'modified', 'status', 'flagged_date'];
  const filterableColumns = ['created', 'status', 'amount'];
  const api = new ApiResourceList(donationsData, defaultSortBys, sortableColumns);
  cy.intercept({ pathname: getEndpoint(CONTRIBUTIONS) }, (req) => {
    const urlSearchParams = new URLSearchParams(req.url.split('?')[1]);
    const pageSize = urlSearchParams.get('page_size');
    const pageNum = urlSearchParams.get('page');
    const ordering = urlSearchParams.get('ordering');
    const filters = {};
    filterableColumns.forEach((f) => (filters[f] = urlSearchParams.getAll(f)));
    req.reply(api.getResponse(pageSize, pageNum, ordering, filters));
  }).as('getDonations');
});
