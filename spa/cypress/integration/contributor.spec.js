import { GET_MAGIC_LINK, VERIFY_TOKEN } from 'ajax/endpoints';
import { getEndpoint } from '../support/util';
import { CONTRIBUTOR_ENTRY, CONTRIBUTOR_VERIFY, CONTRIBUTOR_DASHBOARD } from 'routes';

describe('Contributor portal', () => {
  before(() => {
    cy.visit(CONTRIBUTOR_ENTRY);
  });

  describe('Contributor magic link request', () => {
    it('should send request with provided email', () => {
      const email = 'test@testing.com';
      cy.intercept('POST', getEndpoint(GET_MAGIC_LINK)).as('getMagicLink');
      cy.getByTestId('magic-link-email-input').type(email);
      cy.getByTestId('magic-link-email-button').click();
      return cy.wait('@getMagicLink').then((intercept) => {
        expect(intercept.request.body.email).equal(email);
      });
    });

    it('should display server generated error on email if non-200 status', () => {
      const emailError = ['email error'];
      cy.intercept(
        { method: 'POST', url: getEndpoint(GET_MAGIC_LINK) },
        { body: { email: emailError }, statusCode: 400 }
      ).as('getMagicLink');
      cy.getByTestId('magic-link-email-button').click();
    });
    it('should display generic success message if status 200', () => {
      cy.intercept({ method: 'POST', url: getEndpoint(GET_MAGIC_LINK) }, { statusCode: 200 }).as('getMagicLink');
      cy.getByTestId('magic-link-email-button').click();
      cy.contains("If you're in our system, an email has been sent to you containing your magic link");
    });
  });
});
