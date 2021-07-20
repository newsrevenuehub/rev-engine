import { GET_MAGIC_LINK, VERIFY_TOKEN, CONTRIBUTIONS, CANCEL_RECURRING } from 'ajax/endpoints';
import { getEndpoint } from '../support/util';
import { CONTRIBUTOR_ENTRY, CONTRIBUTOR_VERIFY } from 'routes';
import donationsData from '../fixtures/donations/18-results.json';

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
    beforeEach(() => {
      // "Log in" to contributor dash
      cy.intercept({ method: 'POST', url: getEndpoint(VERIFY_TOKEN) }, { fixture: 'user/valid-contributor-1.json' }).as(
        'login'
      );
      cy.interceptPaginatedDonations();
      cy.visit(CONTRIBUTOR_VERIFY);
      cy.wait(['@login', '@getDonations']);
    });

    it('should display a list of contributions', () => {
      cy.getByTestId('donations-table');
      // DonationsTable is well tested elsewhere...
      cy.getByTestId('total-results').contains('18');
      // ... though here we should see different column headers
      const expectedColumns = ['Amount', 'Date', 'Type', 'Receipt date', 'Payment status', 'Payment method', 'Cancel'];
      cy.getByTestId('donation-header', {}, true).should('have.length', expectedColumns.length);
      cy.getByTestId('donation-header', {}, true).should(($headers) => {
        const headersSet = new Set($headers.toArray().map((header) => header.innerText));
        const expectedSet = new Set(expectedColumns);
        expect(headersSet.size).to.be.greaterThan(0);
        expect(isEqual(headersSet, expectedSet)).to.be.true;
        expectedSet.forEach((header, i) => header === headersSet[i]);
      });
    });

    it('should show icons for payment methods and last4 digits of card', () => {
      // VISA
      const visaContribution = donationsData.find((d) => d.card_brand === 'visa');
      const visaId = visaContribution?.id;
      const visaNum = visaContribution?.last4;
      cy.get(`[data-donationid="${visaId}"`).within(() => {
        cy.getByTestId('card-icon-visa');
      });
      cy.get(`[data-donationid="${visaId}"`).contains(visaNum);

      // MASTERCARD
      const mcContribution = donationsData.find((d) => d.card_brand === 'mastercard');
      const mcId = mcContribution?.id;
      const mcNum = mcContribution?.last4;
      cy.get(`[data-donationid="${mcId}"`).within(() => {
        cy.getByTestId('card-icon-mastercard');
      });
      cy.get(`[data-donationid="${mcId}"`).contains(mcNum);

      // DISCOVER
      const discoverContribution = donationsData.find((d) => d.card_brand === 'discover');
      const discoverId = discoverContribution?.id;
      const discoverNum = discoverContribution?.last4;
      cy.get(`[data-donationid="${discoverId}"`).within(() => {
        cy.getByTestId('card-icon-discover');
      });
      cy.get(`[data-donationid="${discoverId}"`).contains(discoverNum);

      // AMEX
      const amexContribution = donationsData.find((d) => d.card_brand === 'amex');
      const amexId = amexContribution?.id;
      const amexNum = amexContribution?.last4;
      cy.get(`[data-donationid="${amexId}"`).within(() => {
        cy.getByTestId('card-icon-amex');
      });
      cy.get(`[data-donationid="${amexId}"`).contains(amexNum);
    });

    it('should only show cancel button for recurring payments', () => {
      const oneTimeCont = donationsData.find((d) => d.interval === 'one_time');
      const oneTimeId = oneTimeCont.id;
      cy.get(`[data-donationid="${oneTimeId}"]`).within(() => {
        cy.getByTestId('cancel-recurring-button').should('not.exist');
      });
      const recurringCont = donationsData.find((d) => d.interval !== 'one_time');
      const recurringId = recurringCont.id;
      cy.get(`[data-donationid="${recurringId}"]`).within(() => {
        cy.getByTestId('cancel-recurring-button').should('exist');
      });
    });

    it.only('should show update payment method modal when payment method clicked', () => {
      cy.getByTestId('payment-method').first().click();
      cy.wait(10000);
      cy.getByTestId('edit-recurring-payment-modal').should('exist');
      cy.getByTestId('close-modal').click();
    });

    it('should do send cancel request if continue is clicked', () => {
      const targetContId = donationsData.find((d) => d.interval !== 'one_time').id;
      cy.get(`[data-donationid="${targetContId}"]`).within(() => {
        cy.getByTestId('cancel-recurring-button').click();
      });
      cy.intercept(getEndpoint(`${CONTRIBUTIONS}${targetContId}/${CANCEL_RECURRING}`, { statusCode: 200 })).as(
        'cancelRecurring'
      );
      cy.getByTestId('continue-button').click();
      cy.wait('@cancelRecurring');
    });
  });
});
