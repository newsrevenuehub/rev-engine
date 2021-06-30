import { GET_MAGIC_LINK, VERIFY_TOKEN } from 'ajax/endpoints';
import { getEndpoint } from '../support/util';
import { CONTRIBUTOR_ENTRY, CONTRIBUTOR_VERIFY, CONTRIBUTOR_DASHBOARD } from 'routes';

describe('Contributor portal', () => {
  before(() => {
    cy.visit(CONTRIBUTOR_ENTRY);
  });

  describe('Contributor magic link authentication', () => {
    it('should send request with provided email', () => {
      cy.intercept('POST', getEndpoint(GET_MAGIC_LINK), (req) => {
        console.log('request', req);
      });
      cy.getByTestId('magic-link-email-input').type('test@testing.com');
      cy.getByTestId('magic-link-email-button').click();
    });
  });
});
