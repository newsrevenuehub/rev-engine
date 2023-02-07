import { SIGN_IN } from 'routes';

describe('Append trailing slash to the URL', () => {
  it('should append slash to the url with if NOT given', () => {
    cy.visit('sign-in');
    cy.url().should('include', SIGN_IN);
  });
  it('should maintain query params after appending slash', () => {
    cy.visit('sign-in?qs=test');
    cy.url().should('include', SIGN_IN + '?qs=test');
  });
});
