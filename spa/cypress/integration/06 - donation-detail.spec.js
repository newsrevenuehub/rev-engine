import unflaggedContributionDetailData from '../fixtures/donations/donation-not-flagged.json';
import prevFlaggedContributionDetailData from '../fixtures/donations/donation-prev-flagged.json';
import flaggedContributionDetailData from '../fixtures/donations/donation-flagged.json';

import { DONATIONS_SLUG } from 'routes';
import { CONTRIBUTIONS, PROCESS_FLAGGED } from 'ajax/endpoints';
import { getEndpoint } from '../support/util';
import { GENERIC_ERROR } from 'constants/textConstants';

const CONTRIBUTION_PK = 123;

describe('Donation detail', () => {
  describe('Unflagged donation', () => {
    beforeEach(() => {
      cy.login('user/stripe-verified.json');
      cy.intercept('GET', getEndpoint(`${CONTRIBUTIONS}/${CONTRIBUTION_PK}/`), {
        body: unflaggedContributionDetailData
      }).as('getUnflaggedDonation');
      cy.visit(`/dashboard/contributions/${CONTRIBUTION_PK}`);
    });
    it('should display donation details', () => {
      cy.wait('@getUnflaggedDonation');
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
  describe('Previously but no-longer-flagged donation', () => {
    beforeEach(() => {
      cy.login('user/stripe-verified.json');
      cy.intercept('GET', getEndpoint(`${CONTRIBUTIONS}/${CONTRIBUTION_PK}/`), {
        body: prevFlaggedContributionDetailData
      }).as('getNoLongerFlaggedDonation');
      cy.visit(`/dashboard/contributions/${CONTRIBUTION_PK}`);
    });

    it('should display flagged details in addition to donation details', () => {
      cy.wait('@getNoLongerFlaggedDonation');
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
    before(() => {
      cy.login('user/stripe-verified.json');
      cy.intercept('GET', getEndpoint(`${CONTRIBUTIONS}${CONTRIBUTION_PK}/`), {
        body: flaggedContributionDetailData
      }).as('getFlaggedDonation');
      cy.visit(`${DONATIONS_SLUG}/${CONTRIBUTION_PK}`);
    });

    it('should show flagged details with accept/reject buttons', () => {
      cy.wait('@getFlaggedDonation');
      cy.getByTestId('flaggedDate').should('exist');
      cy.getByTestId('accept-flagged-button').should('exist');
      cy.getByTestId('reject-flagged-button').should('exist');
    });

    it('should show comfirmation modal when reject is clicked', () => {
      cy.getByTestId('reject-flagged-button').click();
      cy.getByTestId('confirmation-modal').should('exist');
    });

    it('should do nothing if cancel is clicked', () => {
      cy.getByTestId('cancel-button').click();
      // How on earth do we test "does nothing" in cypress?
    });

    it('should make request with proper body if continue is clicked', () => {
      // There's a frustrating issue with cypress and the way we're utilizing React.createPortal for the confirmation modal.
      // For whatever reason, cypress returns to the login screen here.
      const contributionId = flaggedContributionDetailData.id;
      cy.login('user/stripe-verified.json');
      cy.intercept('GET', getEndpoint(`${CONTRIBUTIONS}${contributionId}/`), {
        body: flaggedContributionDetailData
      }).as('getFlaggedDonation');
      cy.visit(`${DONATIONS_SLUG}/${contributionId}`);

      // The proper test
      cy.getByTestId('reject-flagged-button').click();
      cy.intercept('POST', getEndpoint(`${CONTRIBUTIONS}${contributionId}/${PROCESS_FLAGGED}`), {
        body: { detail: 'rejected' }
      }).as('rejectedSuccess');
      cy.getByTestId('continue-button').click();
      return cy.wait('@rejectedSuccess').then((interception) => {
        expect(interception.request.body.reject).to.equal(true);
      });
    });

    it('should show error message if reject fails', () => {
      const contributionId = flaggedContributionDetailData.id;
      cy.getByTestId('reject-flagged-button').click();
      cy.intercept('POST', getEndpoint(`${CONTRIBUTIONS}${contributionId}/${PROCESS_FLAGGED}`), {
        statusCode: 400
      }).as('rejectFailed');
      cy.getByTestId('continue-button').click();
      cy.wait('@rejectFailed');
      cy.getByTestId('alert').contains(GENERIC_ERROR);
    });

    it('should show success message if reject succeeds', () => {
      // There's a frustrating issue with cypress and the way we're utilizing React.createPortal for the confirmation modal.
      // For whatever reason, cypress returns to the login screen here.
      const contributionId = flaggedContributionDetailData.id;
      cy.login('user/stripe-verified.json');
      cy.intercept('GET', getEndpoint(`${CONTRIBUTIONS}${contributionId}/`), {
        body: flaggedContributionDetailData
      }).as('getFlaggedDonation');
      cy.visit(`${DONATIONS_SLUG}/${contributionId}`);

      cy.getByTestId('reject-flagged-button').click();
      cy.intercept('POST', getEndpoint(`${CONTRIBUTIONS}${contributionId}/${PROCESS_FLAGGED}`), {
        body: { detail: 'rejected' }
      }).as('rejectedSuccess');
      cy.getByTestId('continue-button').click();
      cy.wait('@rejectedSuccess');
      cy.getByTestId('alert').contains('Donation successfully rejected');
    });

    it('should make request with proper body if accept is clicked', () => {
      // There's a frustrating issue with cypress and the way we're utilizing React.createPortal for the confirmation modal.
      // For whatever reason, cypress returns to the login screen here.
      const contributionId = flaggedContributionDetailData.id;
      cy.login('user/stripe-verified.json');
      cy.intercept('GET', getEndpoint(`${CONTRIBUTIONS}${contributionId}/`), {
        body: flaggedContributionDetailData
      }).as('getFlaggedDonation');
      cy.visit(`${DONATIONS_SLUG}/${contributionId}`);

      cy.intercept('POST', getEndpoint(`${CONTRIBUTIONS}${contributionId}/${PROCESS_FLAGGED}`), {
        body: { detail: 'accepted' }
      }).as('acceptSuccess');
      cy.getByTestId('accept-flagged-button').click();

      return cy.wait('@acceptSuccess').then((interception) => {
        expect(interception.request.body.reject).to.equal(false);
      });
    });

    it('should show error message if accept fails', () => {
      const contributionId = flaggedContributionDetailData.id;
      cy.intercept('POST', getEndpoint(`${CONTRIBUTIONS}${contributionId}/${PROCESS_FLAGGED}`), {
        statusCode: 400
      }).as('acceptFailure');
      cy.getByTestId('accept-flagged-button').click();
      cy.wait('@acceptFailure');
      cy.getByTestId('alert').contains(GENERIC_ERROR);
    });

    it('should show success message if accept succeeds', () => {
      const contributionId = flaggedContributionDetailData.id;
      cy.intercept('POST', getEndpoint(`${CONTRIBUTIONS}${contributionId}/${PROCESS_FLAGGED}`), {
        body: { detail: 'accepted' }
      }).as('acceptSuccess');
      cy.getByTestId('accept-flagged-button').click();
      cy.wait('@acceptSuccess');
      cy.getByTestId('alert').contains('Donation successfully accepted');
    });
  });
});
