import unflaggedContributionDetailData from '../fixtures/donations/donation-not-flagged.json';
import prevFlaggedContributionDetailData from '../fixtures/donations/donation-prev-flagged.json';
import flaggedContributionDetailData from '../fixtures/donations/donation-flagged.json';
import donationPageContributionDetailData from '../fixtures/donations/donation-paid-donation-page.json';

import { DONATIONS_SLUG } from 'routes';
import { CONTRIBUTIONS, PROCESS_FLAGGED, USER, LIST_PAGES } from 'ajax/endpoints';
import { getEndpoint } from '../support/util';
import { GENERIC_ERROR } from 'constants/textConstants';

import hubAdminWithoutFlags from '../fixtures/user/login-success-hub-admin';
import { CONTRIBUTIONS_SECTION_ACCESS_FLAG_NAME } from 'constants/featureFlagConstants';

const contribSectionsFlag = {
  id: '1234',
  name: CONTRIBUTIONS_SECTION_ACCESS_FLAG_NAME
};

const hubAdminWithFlags = {
  ...hubAdminWithoutFlags['user'],
  flags: [{ ...contribSectionsFlag }]
};

const pageListBody = {
  id: 1,
  revenue_program: {
    id: 2,
    name: 'Test RV'
  }
};

const CONTRIBUTION_PK = 123;
const testDonationPageUrl = DONATIONS_SLUG + CONTRIBUTION_PK;

describe('Donation detail', () => {
  describe('Dynamic page title', () => {
    before(() => {
      cy.forceLogin(hubAdminWithFlags);
      cy.intercept({ method: 'GET', pathname: getEndpoint(`${LIST_PAGES}**`) }, { body: pageListBody }).as('getPages');
      cy.intercept(getEndpoint(LIST_PAGES), { fixture: 'pages/list-pages-1' }).as('listPages');
      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: hubAdminWithFlags });
      cy.intercept('GET', getEndpoint(CONTRIBUTIONS + CONTRIBUTION_PK), {
        body: donationPageContributionDetailData
      }).as('getDonationPageDonation');
      cy.visit(testDonationPageUrl);
      cy.wait('@listPages');
    });
    it('should display revenue program name in page title', () => {
      cy.wait('@getPages');
      cy.wait('@getDonationPageDonation');
      cy.title().should('eq', `${CONTRIBUTION_PK} | ${pageListBody.revenue_program.name} | Contributions | RevEngine`);
    });
  });

  describe('Unflagged donation', () => {
    beforeEach(() => {
      cy.forceLogin(hubAdminWithFlags);
      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: hubAdminWithFlags });
      cy.intercept('GET', getEndpoint(CONTRIBUTIONS + CONTRIBUTION_PK), {
        body: unflaggedContributionDetailData
      }).as('getUnflaggedDonation');
      cy.visit(testDonationPageUrl);
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
      cy.forceLogin(hubAdminWithFlags);
      cy.intercept(getEndpoint(LIST_PAGES), { fixture: 'pages/list-pages-1' }).as('listPages');
      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: hubAdminWithFlags });
      cy.intercept('GET', getEndpoint(CONTRIBUTIONS + CONTRIBUTION_PK), {
        body: prevFlaggedContributionDetailData
      }).as('getNoLongerFlaggedDonation');
      cy.visit(testDonationPageUrl);
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
    beforeEach(() => {
      cy.forceLogin(hubAdminWithFlags);
      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: hubAdminWithFlags });
      cy.intercept({ method: 'GET', pathname: getEndpoint(LIST_PAGES) }, { body: [], statusCode: 200 });
      cy.intercept('GET', getEndpoint(`${CONTRIBUTIONS}${CONTRIBUTION_PK}/`), {
        body: flaggedContributionDetailData
      }).as('getFlaggedDonation');
      cy.visit(testDonationPageUrl);
      cy.wait('@getFlaggedDonation');
    });

    it('should show flagged details with accept/reject buttons', () => {
      cy.getByTestId('flaggedDate').should('exist');
      cy.getByTestId('accept-flagged-button').should('exist');
      cy.getByTestId('reject-flagged-button').should('exist');
    });

    it('should show comfirmation modal when reject is clicked', () => {
      cy.getByTestId('reject-flagged-button').click();
      cy.getByTestId('confirmation-modal').should('exist');
    });

    it('should do nothing if cancel is clicked', () => {
      cy.getByTestId('reject-flagged-button').click();
      cy.getByTestId('cancel-button').click();
      // How on earth do we test "does nothing" in cypress?
    });

    it('should make request with proper body if continue is clicked', () => {
      cy.getByTestId('reject-flagged-button').click();
      cy.intercept('POST', getEndpoint(`${CONTRIBUTIONS}${CONTRIBUTION_PK}/${PROCESS_FLAGGED}`), {
        body: { detail: 'rejected' }
      }).as('rejectedSuccess');
      cy.getByTestId('continue-button').click();
      return cy.wait('@rejectedSuccess').then((interception) => {
        expect(interception.request.body.reject).to.equal(true);
      });
    });

    it('should show error message if reject fails', () => {
      cy.getByTestId('reject-flagged-button').click();
      cy.intercept('POST', getEndpoint(`${CONTRIBUTIONS}${CONTRIBUTION_PK}/${PROCESS_FLAGGED}`), {
        statusCode: 400
      }).as('rejectFailed');
      cy.getByTestId('continue-button').click();
      cy.wait('@rejectFailed');
      cy.getByTestId('alert').contains(GENERIC_ERROR);
    });

    it('should show success message if reject succeeds', () => {
      cy.getByTestId('reject-flagged-button').click();
      cy.intercept('POST', getEndpoint(`${CONTRIBUTIONS}${CONTRIBUTION_PK}/${PROCESS_FLAGGED}`), {
        body: { detail: 'rejected' }
      }).as('rejectedSuccess');
      cy.getByTestId('continue-button').click();
      cy.wait('@rejectedSuccess');
      cy.getByTestId('alert').contains('Donation successfully rejected');
    });

    it('should make request with proper body if accept is clicked', () => {
      const contributionId = flaggedContributionDetailData.id;
      cy.intercept('GET', getEndpoint(CONTRIBUTIONS + contributionId), {
        body: flaggedContributionDetailData
      }).as('getFlaggedDonation');
      cy.visit(DONATIONS_SLUG + contributionId);

      cy.intercept('POST', getEndpoint(`${CONTRIBUTIONS}${contributionId}/${PROCESS_FLAGGED}`), {
        body: { detail: 'accepted' }
      }).as('acceptSuccess');
      cy.getByTestId('accept-flagged-button').click();

      return cy.wait('@acceptSuccess').then((interception) => {
        expect(interception.request.body.reject).to.equal(false);
      });
    });

    it('should show error message if accept fails', () => {
      cy.intercept('POST', getEndpoint(`${CONTRIBUTIONS}${CONTRIBUTION_PK}/${PROCESS_FLAGGED}`), {
        statusCode: 400
      }).as('acceptFailure');
      cy.getByTestId('accept-flagged-button').click();
      cy.wait('@acceptFailure');
      cy.getByTestId('alert').contains(GENERIC_ERROR);
    });

    it('should show success message if accept succeeds', () => {
      cy.intercept('POST', getEndpoint(`${CONTRIBUTIONS}${CONTRIBUTION_PK}/${PROCESS_FLAGGED}`), {
        body: { detail: 'accepted' }
      }).as('acceptSuccess');
      cy.getByTestId('accept-flagged-button').click();
      cy.wait('@acceptSuccess');
      cy.getByTestId('alert').contains('Donation successfully accepted');
    });
  });
});
