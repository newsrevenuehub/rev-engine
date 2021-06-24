import isEqual from 'lodash.isequal';

import { DONATIONS } from 'ajax/endpoints';
import { getEndpoint } from '../support/util';

import { formatCurrencyAmount, formatDateTime } from 'components/donations/utils';

describe('Donation page', () => {
  beforeEach(() => {
    cy.login('user/stripe-verified.json');
    cy.fixture('donations/page-1-results.json')
      .as('page1DonationsData')
      .then((donations) => {
        cy.intercept(`${getEndpoint(DONATIONS)}**`, { query: { page_size: '10', page: '1' } }, donations);
      });
    cy.fixture('donations/page-2-results.json')
      .as('page2DonationsData')
      .then((donations) => {
        cy.intercept(`${getEndpoint(DONATIONS)}**`, { query: { page_size: '10', page: '2' } }, donations);
      });
    cy.visit('/dashboard/donations/');
  });
  it('should display the first page of donations by default on page load', function () {
    const { results: page1Results } = this.page1DonationsData;
    cy.getByTestId('donations-table')
      .find('tbody tr[data-testid="donation-row"]')
      .should('have.length', page1Results.length);
  });
  it('should display the right columns and row values', function () {
    const missingValueString = '---';
    const columnExpectations = [
      {
        rawName: 'last_payment_date',
        renderedName: 'Payment date',
        transform: (rawVal) => (rawVal ? formatDateTime(rawVal) : missingValueString)
      },
      {
        rawName: 'amount',
        renderedName: 'Amount',
        transform: (rawVal) => (rawVal ? formatCurrencyAmount(rawVal) : missingValueString)
      },
      { rawName: 'contributor_email', renderedName: 'Donor', transform: (rawVal) => rawVal || missingValueString },
      { rawName: 'status', renderedName: 'Status', transform: (rawVal) => rawVal || missingValueString },
      {
        rawName: 'flagged_date',
        renderedName: 'Date flagged',
        transform: (rawVal) => (rawVal ? formatDateTime(rawVal) : missingValueString)
      }
    ];
    cy.getByTestId('donation-header').should('have.length', columnExpectations.length);
    cy.getByTestId('donation-header').should(($headers) => {
      const headersSet = new Set($headers.toArray().map((header) => header.innerText));
      const expectedSet = new Set(columnExpectations.map((header) => header.renderedName));
      expect(headersSet.size).to.be.greaterThan(0);
      expect(isEqual(headersSet, expectedSet)).to.be.true();
    });
    cy.getByTestId('donation-row').each(($rowEl, index) => {
      const dataRow = this.page1DonationsData.results[index];
      const cells = $rowEl.find('td');
      // this turns out to be jQuery .each, not cypress each, so method
      // signature is index, el not reverse
      cells.each((index, $cellEl) => {
        const colAccessor = $cellEl.getAttribute('data-testcolumnaccessor');
        const dataVal = dataRow[colAccessor];
        const { transform } = columnExpectations.find((element) => element.rawName === colAccessor);
        const cellVal = $cellEl.innerText;
        expect(cellVal).to.equal(transform(dataVal));
      });
    });
  });
  it('should display the second page of donations when click on next page', function () {
    const { results: page2Results } = this.page2DonationsData;
    cy.getByTestId('next-page').click();
    cy.getByTestId('donations-table')
      .find('tbody tr[data-testid="donation-row"]')
      .should('have.length', page2Results.length);
  });

  // next / prev /first /last with disabled all work
});
