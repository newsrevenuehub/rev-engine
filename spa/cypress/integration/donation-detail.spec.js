import contributionDetailData from '../fixtures/donations/donation-244.json';
import { CONTRIBUTIONS } from 'ajax/endpoints';
import { getEndpoint } from '../support/util';

const CONTRIBUTION_DETAIL_PK = '244';

describe('Donation page', () => {
  beforeEach(() => {
    cy.login('user/stripe-verified.json');
    cy.intercept('GET', getEndpoint(`${CONTRIBUTIONS}/${CONTRIBUTION_DETAIL_PK}/`), {
      body: contributionDetailData
    }).as('getDonation');
    cy.visit(`/dashboard/donations/${CONTRIBUTION_DETAIL_PK}`);
  });
  it('should display donation details', () => {
    cy.wait('@getDonation');
    cy.getByTestId('donation-detail');
    const expectedAttrs = [
      'donorEmail',
      'amount',
      'interval',
      'lastPaymentDate',
      'flaggedDate',
      'paymentProvider',
      'paymentProviderCustomerId',
      'reason',
      'status'
    ];
    expectedAttrs.forEach((attr) => cy.getByTestId(attr).invoke('text').should('have.length.gte', 1));
  });
});
