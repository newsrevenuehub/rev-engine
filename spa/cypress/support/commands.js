import 'cypress-localstorage-commands';
import '@testing-library/cypress/add-commands';

import { getEndpoint, getTestingDonationPageUrl, getTestingDefaultDonationPageUrl, EXPECTED_RP_SLUG } from './util';
import { LIVE_PAGE_DETAIL, STRIPE_PAYMENT, CONTRIBUTIONS } from 'ajax/endpoints';
import { DEFAULT_RESULTS_ORDERING } from 'components/donations/DonationsTable';
import { ApiResourceList } from '../support/restApi';
import donationsData from '../fixtures/donations/18-results.json';
import { LS_USER } from 'appSettings';

Cypress.Commands.add('getByTestId', (testId, options, partialMatch = false) => {
  return cy.get(`[data-testid${partialMatch ? '*' : ''}="${testId}"]`, options);
});

Cypress.Commands.add('forceLogin', (userFixture) => {
  cy.clearLocalStorage();
  cy.setLocalStorage(LS_USER, JSON.stringify(userFixture.user));
});

Cypress.Commands.add('visitDonationPage', () => {
  cy.intercept(
    { method: 'GET', pathname: getEndpoint(LIVE_PAGE_DETAIL) },
    { fixture: 'pages/live-page-1', statusCode: 200 }
  ).as('getPageDetail');
  cy.visit(getTestingDonationPageUrl('my-page/'));
  cy.url().should('include', EXPECTED_RP_SLUG);
  cy.url().should('include', 'my-page');
  cy.wait('@getPageDetail');
});

Cypress.Commands.add('visitDefaultDonationPage', () => {
  cy.intercept(
    { method: 'GET', pathname: getEndpoint(LIVE_PAGE_DETAIL) },
    { fixture: 'pages/live-page-1', statusCode: 200 }
  ).as('getPageDetail');
  cy.visit(getTestingDefaultDonationPageUrl());
  cy.url().should('include', EXPECTED_RP_SLUG);
  cy.wait('@getPageDetail');
});

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

Cypress.Commands.add('interceptStripeApi', () => {
  cy.intercept({ url: 'https://r.stripe.com/*', method: 'POST' }, { statusCode: 200 });
  cy.intercept({ url: 'https://m.stripe.com/*', method: 'POST' }, { statusCode: 200 });
  cy.intercept({ url: 'https://api.stripe.com/**', method: 'GET' }, { statusCode: 200 });
});

Cypress.Commands.add('interceptPaginatedDonations', (data = donationsData) => {
  const defaultSortBys = {
    columns: DEFAULT_RESULTS_ORDERING.map((item) => item.id),
    directions: DEFAULT_RESULTS_ORDERING.map((item) => (item.desc ? 'desc' : 'asc'))
  };
  const sortableColumns = [
    'last_payment_date',
    'amount',
    'contributor_email',
    'modified',
    'status',
    'flagged_date',
    'revenue_program__name'
  ];
  const filterableColumns = ['created', 'status', 'amount'];
  const api = new ApiResourceList(data, defaultSortBys, sortableColumns);
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

Cypress.Commands.add('editElement', (elementType) => {
  cy.getByTestId(`page-item-${elementType}`)
    .first()
    .within(() => {
      cy.getByTestId('pencil-button').click({ force: true });
    });
});

Cypress.Commands.add('setStripeCardElement', (elementName, value) => {
  return cy.getByTestId('edit-recurring-payment-modal').within(($modal) => {
    cy.wrap($modal)
      .get('iframe')
      .its('0.contentDocument.body')
      .should('not.be.empty')
      .then(cy.wrap)
      .find(`input[data-elements-stable-field-name="${elementName}"]`)
      .type(value);
  });
});

Cypress.Commands.add('interceptFbAnalytics', () => {
  cy.intercept({ method: 'GET', url: 'https://connect.facebook.net/*' }, { statusCode: 200 });
  cy.intercept({ method: 'GET', url: '*ev=Contribute*' }, { statusCode: 200 }).as('fbTrackContribution');
  cy.intercept({ method: 'GET', url: '*ev=Purchase*' }, { statusCode: 200 }).as('fbTrackPurchase');
});

Cypress.Commands.add('interceptGoogleRecaptcha', () => {
  // This can be helpful to add because in test env, sometimes the live recaptcha returns an error
  // (possibly because we load it too many times successively?), which can cause test failures.
  cy.intercept({ method: 'GET', url: 'https://www.google.com/recaptcha/*' }, { statusCode: 200 });
});
