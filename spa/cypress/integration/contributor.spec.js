import { GET_MAGIC_LINK, VERIFY_TOKEN } from 'ajax/endpoints';
import { getEndpoint } from '../support/util';
import { CONTRIBUTOR_ENTRY, CONTRIBUTOR_VERIFY } from 'routes';

// Util
import isEqual from 'lodash.isequal';

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
      cy.visit(CONTRIBUTOR_ENTRY);
      cy.intercept(
        { method: 'POST', url: getEndpoint(GET_MAGIC_LINK) },
        { body: { email: emailError }, statusCode: 400 }
      ).as('getMagicLink');
      cy.getByTestId('magic-link-email-button').click();
      cy.contains(emailError[0]);
    });
    it('should display generic success message if status 200', () => {
      cy.intercept({ method: 'POST', url: getEndpoint(GET_MAGIC_LINK) }, { statusCode: 200 }).as('getMagicLink');
      cy.getByTestId('magic-link-email-button').click();
      cy.contains("If you're in our system, an email has been sent to you containing your magic link");
    });
  });

  describe('Contributor dashboard', () => {
    before(() => {
      // "Log in" to contributor dash
      cy.intercept({ method: 'POST', url: getEndpoint(VERIFY_TOKEN) }, { fixture: 'user/valid-contributor-1.json' });
      cy.visit(CONTRIBUTOR_VERIFY);
      cy.getPaginatedDonations();
    });
    it('should display a list of contributions', () => {
      cy.getByTestId('donations-table');
      // DonationsTable is well tested elsewhere...
      cy.getByTestId('total-results').contains('18');
      // ... though here we should see different column headers
      const expectedColumns = [
        {
          renderedName: 'Amount',
          rawName: 'amount'
        },
        {
          renderedName: 'Date',
          rawName: 'created'
        },
        {
          renderedName: 'Type',
          rawName: 'interval'
        },
        {
          renderedName: 'Receipt date',
          rawName: 'last_payment_date'
        },
        {
          renderedName: 'Payment status',
          rawName: 'status'
        }
      ];
      cy.getByTestId('donation-header', {}, true).should('have.length', expectedColumns.length);
      cy.getByTestId('donation-header', {}, true).should(($headers) => {
        const headersSet = new Set($headers.toArray().map((header) => header.innerText));
        const expectedSet = new Set(expectedColumns.map((header) => header.renderedName));
        expect(headersSet.size).to.be.greaterThan(0);
        expect(isEqual(headersSet, expectedSet)).to.be.true;
      });
    });
  });
});
