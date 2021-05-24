import { TOKEN } from 'ajax/endpoints';
import { getEndpoint } from './util';

Cypress.Commands.add('getByTestId', (testId) => {
  return cy.get(`[data-testid="${testId}"]`);
});

Cypress.Commands.add('login', (userFixture) => {
  cy.clearLocalStorage();
  cy.visit('/');
  cy.getByTestId('login-email').type('test@user.com');
  cy.getByTestId('login-password').type('testing');
  cy.intercept('POST', getEndpoint(TOKEN), { fixture: userFixture });
  cy.getByTestId('login-button').click();
});
