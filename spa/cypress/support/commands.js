import { TOKEN } from 'ajax/endpoints';
import { getEndpoint } from './util';
import { LIVE_PAGE } from 'ajax/endpoints';

Cypress.Commands.add('getByTestId', (testId, options) => {
  return cy.get(`[data-testid="${testId}"]`, options);
});

Cypress.Commands.add('login', (userFixture) => {
  cy.clearLocalStorage();
  cy.visit('/');
  cy.getByTestId('login-email').type('test@user.com');
  cy.getByTestId('login-password').type('testing');
  cy.intercept('POST', getEndpoint(TOKEN), { fixture: userFixture });
  cy.getByTestId('login-button').click();
});

Cypress.Commands.add('visitDonationPage', () => {
  cy.intercept({ method: 'GET', pathname: getEndpoint(LIVE_PAGE) }, { fixture: 'pages/live-page-1', statusCode: 200 });
  cy.visit('/revenue-program-slug/page-slug');
  cy.getByTestId('donation-payment-form', { timeout: 2000 });
});
