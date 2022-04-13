import './commands';

Cypress.on('uncaught:exception', (err, runnable) => {
  // returning false here prevents Cypress from failing tests on uncaught exceptions.
  // Tests were failing when an ajax call was made the the backend, which,
  // in this context is not running-- causing an uncaught exception. This
  // will fail the test, even though the test may not care about the ajax.
  // Most tests use cy.intercept to capture the request and mock the response,
  // but this isn't always feasible.
  return false;
});
