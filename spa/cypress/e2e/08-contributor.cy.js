import { GET_MAGIC_LINK } from 'ajax/endpoints';
import { CONTRIBUTOR_ENTRY } from 'routes';
import { getEndpoint } from '../support/util';

describe('New Portal', () => {
  before(() => {
    cy.visit(CONTRIBUTOR_ENTRY);
  });

  describe('Contributor magic link request', () => {
    it('should send request with provided email', () => {
      const email = 'test@testing.com';
      cy.intercept('POST', getEndpoint(GET_MAGIC_LINK)).as('getMagicLink');
      cy.findByRole('textbox', { name: 'Email Address' }).type(email);
      cy.findByRole('button', { name: 'Send Magic Link' }).click();
      return cy.wait('@getMagicLink').then((intercept) => {
        expect(intercept.request.body.email).equal(email);
      });
    });
  });
});
