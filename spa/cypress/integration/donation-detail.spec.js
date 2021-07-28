import unflaggedContributionDetailData from '../fixtures/donations/donation-not-flagged.json';
import prevFlaggedContributionDetailData from '../fixtures/donations/donation-prev-flagged.json';
import flaggedContributionDetailData from '../fixtures/donations/donation-flagged.json';

import { CONTRIBUTIONS } from 'ajax/endpoints';
import { getEndpoint } from '../support/util';

const CONTRIBUTION_PK = 123;

describe('Donation detail', () => {
  describe('Unflagged donation', () => {
    beforeEach(() => {
      cy.login('user/stripe-verified.json');
      cy.intercept('GET', getEndpoint(`${CONTRIBUTIONS}/${CONTRIBUTION_PK}/`), {
        body: unflaggedContributionDetailData
      }).as('getDonation');
      cy.visit(`/dashboard/donations/${CONTRIBUTION_PK}`);
    });
    it('should display donation details', () => {
      cy.wait('@getDonation');
      cy.getByTestId('donation-detail');
      const expectedAttrs = [
        'donorEmail',
        'amount',
        'interval',
        'lastPaymentDate',
        'paymentProvider',
        'payment-resource-link',
        'subscription-resource-link',
        'customer-resource-link',
        'status'
      ];
      expectedAttrs.forEach((attr) => cy.getByTestId(attr).invoke('text').should('have.length.gte', 1));
    });
  });
  describe('Previously but not-longer-flagged donation', () => {
    beforeEach(() => {
      cy.login('user/stripe-verified.json');
      cy.intercept('GET', getEndpoint(`${CONTRIBUTIONS}/${CONTRIBUTION_PK}/`), {
        body: prevFlaggedContributionDetailData
      }).as('getDonation');
      cy.visit(`/dashboard/donations/${CONTRIBUTION_PK}`);
    });

    it('should display flagged details in addition to donation details', () => {
      cy.wait('@getDonation');
      cy.getByTestId('donation-detail');
      const expectedAttrs = [
        'donorEmail',
        'amount',
        'interval',
        'lastPaymentDate',
        'flaggedDate',
        'paymentProvider',
        'payment-resource-link',
        'subscription-resource-link',
        'customer-resource-link',
        'status'
      ];
      expectedAttrs.forEach((attr) => cy.getByTestId(attr).invoke('text').should('have.length.gte', 1));
      cy.getByTestId('accept-flagged-button').should('not.exist');
      cy.getByTestId('reject-flagged-button').should('not.exist');
    });
  });

  describe('Flagged donation', () => {
    cy.intercept('GET', getEndpoint(`${CONTRIBUTIONS}/${CONTRIBUTION_PK}/`), {
      body: flaggedContributionDetailData
    }).as('getDonation');
    cy.visit(`/dashboard/donations/${CONTRIBUTION_PK}`);
  });
});
