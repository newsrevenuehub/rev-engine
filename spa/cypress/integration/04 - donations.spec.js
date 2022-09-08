import isEqual from 'lodash.isequal';

import { NO_VALUE } from 'constants/textConstants';
import { PAYMENT_STATUS_EXCLUDE_IN_CONTRIBUTIONS } from 'constants';
import { DONATIONS_SLUG } from 'routes';
import { USER } from 'ajax/endpoints';

// Data
import donationsData from '../fixtures/donations/18-results.json';

// Utils
import { getFrequencyAdjective } from 'utilities/parseFrequency';
import formatDatetimeForDisplay from 'utilities/formatDatetimeForDisplay';
import formatCurrencyAmount from 'utilities/formatCurrencyAmount';
import toTitleCase from 'utilities/toTitleCase';
import { getEndpoint } from '../support/util';

import { CONTRIBUTIONS_SECTION_ACCESS_FLAG_NAME } from 'constants/featureFlagConstants';
import hubAdminWithoutFlags from '../fixtures/user/hub-admin';

const contribSectionsFlag = {
  id: '1234',
  name: CONTRIBUTIONS_SECTION_ACCESS_FLAG_NAME
};

const hubAdminWithFlags = {
  ...hubAdminWithoutFlags['user'],
  flags: [{ ...contribSectionsFlag }]
};

const hubAdminWithoutAnyFlag = {
  ...hubAdminWithoutFlags['user'],
  flags: []
};

describe('Donations list', () => {
  context('User does have contributions section access flag', () => {
    it('should be accessible', () => {
      cy.forceLogin(hubAdminWithFlags);
      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: hubAdminWithFlags });
      cy.interceptPaginatedDonations();
      cy.visit(DONATIONS_SLUG);
      cy.getByTestId('donations-table').should('exist');
    });
  });
  context('User does NOT have contributions section access flag', () => {
    it('should not be accessible', () => {
      cy.forceLogin(hubAdminWithoutFlags);
      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: hubAdminWithoutAnyFlag });
      cy.interceptPaginatedDonations();
      cy.visit(DONATIONS_SLUG);
      cy.url().should('include', DONATIONS_SLUG);
      cy.getByTestId('donations-table').should('not.exist');
    });
  });

  describe('Table', () => {
    beforeEach(() => {
      cy.forceLogin(hubAdminWithFlags);
      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: hubAdminWithFlags });
      cy.interceptPaginatedDonations();
      cy.visit(DONATIONS_SLUG);
    });
    it('should display the first page of donations by default on page load', () => {
      cy.wait('@getDonations').then((intercept) => {
        const urlSearchParams = new URLSearchParams(intercept.request.url.split('?')[1]);
        cy.getByTestId('donations-table')
          .find('tbody tr[data-testid="donation-row"]')
          .should('have.length', parseInt(urlSearchParams.get('page_size')));
      });
    });
    it('should display the right columns and row values', () => {
      const columnExpectations = [
        {
          renderedName: 'Date',
          rawName: 'created',
          transform: (rawVal) => (rawVal ? formatDatetimeForDisplay(rawVal) : NO_VALUE)
        },
        {
          renderedName: 'Amount',
          rawName: 'amount',
          transform: (rawVal) => (rawVal ? formatCurrencyAmount(rawVal) : NO_VALUE)
        },
        {
          renderedName: 'Frequency',
          rawName: 'interval',
          transform: (rawVal) => (rawVal ? getFrequencyAdjective(rawVal) : NO_VALUE)
        },
        {
          renderedName: 'Payment received',
          rawName: 'last_payment_date',
          transform: (rawVal) => (rawVal ? formatDatetimeForDisplay(rawVal) : NO_VALUE)
        },
        {
          renderedName: 'Contributor',
          rawName: 'contributor_email',
          transform: (rawVal) => rawVal || NO_VALUE
        },
        {
          renderedName: 'Payment status',
          rawName: 'status',
          transform: (rawVal) => toTitleCase(rawVal) || NO_VALUE
        }
      ];
      cy.getByTestId('donation-header', {}, true).should('have.length', columnExpectations.length);
      cy.getByTestId('donation-header', {}, true).should(($headers) => {
        const headersSet = new Set($headers.toArray().map((header) => header.innerText));
        const expectedSet = new Set(columnExpectations.map((header) => header.renderedName));
        expect(headersSet.size).to.be.greaterThan(0);
        expect(isEqual(headersSet, expectedSet)).to.be.true;
      });
      cy.getByTestId('donation-row').each(($rowEl, index) => {
        const dataRow = donationsData.find((row) => row.id === parseInt($rowEl.attr('data-donationid')));
        const cells = $rowEl.find('td');
        // this turns out to be jQuery .each, not cypress each, so method
        // signature is index, el not reverse
        cells.each((index, $cellEl) => {
          const colAccessor = $cellEl.getAttribute('data-testcolumnaccessor');
          const dataVal = dataRow[colAccessor];
          const { transform } = columnExpectations.find((element) => element.rawName === colAccessor);
          const cellVal = $cellEl.innerText;
          expect(cellVal).to.include(transform(dataVal));
        });
      });
    });

    it('should display the second page of donations when click on next page', () => {
      cy.wait('@getDonations');
      cy.get('li > button[aria-label="Go to page 2"]').click();
      cy.wait('@getDonations').then((intercept) => {
        cy.getByTestId('donations-table')
          .find('tbody tr[data-testid="donation-row"]')
          .should('have.length', intercept.response.body.results.length);
      });
    });

    it('should make donations sortable by payment date', () => {
      cy.wait('@getDonations');
      // will be in ascending order
      cy.getByTestId('donation-header-last_payment_date').click();
      cy.wait('@getDonations');
      cy.getByTestId('donation-row').should(($rows) => {
        const rows = $rows.toArray();
        rows
          .filter((row, index) => index > 0)
          .forEach((row, index) => {
            // index will be the previous row, because we filter out the first item.
            expect(row.dataset.lastpaymentdate >= rows[index].dataset.lastpaymentdate).to.be.true;
          });
      });
      // will be in descending order
      cy.getByTestId('donation-header-last_payment_date').click();
      cy.wait('@getDonations');
      cy.getByTestId('donation-row').should(($rows) => {
        const rows = $rows.toArray();
        rows
          .filter((row, index) => index > 0)
          .forEach((row, index) => {
            // index will be the previous row, because we filter out the first item.
            expect(row.dataset.lastpaymentdate <= rows[index].dataset.lastpaymentdate).to.be.true;
          });
      });
    });
    it('should make donations sortable by amount', () => {
      cy.wait('@getDonations');
      // will be in ascending order
      cy.getByTestId('donation-header-amount').click();
      cy.wait('@getDonations');
      cy.getByTestId('donation-row').should(($rows) => {
        const rows = $rows.toArray();
        rows
          .filter((row, index) => index > 0)
          .forEach((row, index) => {
            // index will be the previous row, because we filter out the first item.
            expect(row.dataset.amount >= rows[index].dataset.amount).to.be.true;
          });
      });
      // will be in descending order
      cy.getByTestId('donation-header-amount').click();
      cy.wait('@getDonations');
      cy.getByTestId('donation-row').should(($rows) => {
        const rows = $rows.toArray();
        rows
          .filter((row, index) => index > 0)
          .forEach((row, index) => {
            // index will be the previous row, because we filter out the first item.
            expect(row.dataset.amount <= rows[index].dataset.amount).to.be.true;
          });
      });
    });

    it('should make donations sortable by donor', () => {
      cy.wait('@getDonations');
      // will be in ascending order
      cy.getByTestId('donation-header-contributor_email').click();
      cy.wait('@getDonations');
      cy.getByTestId('donation-row').should(($rows) => {
        const rows = $rows.toArray();
        rows
          .filter((row, index) => index > 0)
          .forEach((row, index) => {
            // index will be the previous row, because we filter out the first item.
            expect(row.dataset.donor >= rows[index].dataset.donor).to.be.true;
          });
      });
      // will be in descending order
      cy.getByTestId('donation-header-contributor_email').click();
      cy.wait('@getDonations');
      cy.getByTestId('donation-row').should(($rows) => {
        const rows = $rows.toArray();
        rows
          .filter((row, index) => index > 0)
          .forEach((row, index) => {
            // index will be the previous row, because we filter out the first item.
            expect(row.dataset.donor <= rows[index].dataset.donor).to.be.true;
          });
      });
    });

    it('should make donations sortable by status', () => {
      cy.wait('@getDonations');
      // will be in ascending order
      cy.getByTestId('donation-header-status').click();
      cy.wait('@getDonations');
      cy.getByTestId('donation-row').should(($rows) => {
        const rows = $rows.toArray();
        rows
          .filter((row, index) => index > 0)
          .forEach((row, index) => {
            // index will be the previous row, because we filter out the first item.
            expect(row.dataset.status >= rows[index].dataset.status).to.be.true;
          });
      });
      // will be in descending order
      cy.getByTestId('donation-header-status').click();
      cy.wait('@getDonations');
      cy.getByTestId('donation-row').should(($rows) => {
        const rows = $rows.toArray();
        rows
          .filter((row, index) => index > 0)
          .forEach((row, index) => {
            // index will be the previous row, because we filter out the first item.
            expect(row.dataset.status <= rows[index].dataset.status).to.be.true;
          });
      });
    });

    it('should display only expected status', () => {
      cy.wait('@getDonations');
      cy.getByTestId('donation-row').should(($rows) => {
        const rows = $rows.toArray();
        rows
          .filter((row, index) => index > 0)
          .forEach((row, index) => {
            // displayed statuses not in the payment statuses which are excluded in contributions
            expect(PAYMENT_STATUS_EXCLUDE_IN_CONTRIBUTIONS.indexOf(row.dataset.status) == -1).to.be.true;
          });
      });
    });

    it('should have working page controls', () => {
      cy.wait('@getDonations');
      cy.url().should('include', DONATIONS_SLUG);
      // initial state when 2 pages
      cy.get('li > button[aria-label="Go to previous page"]').should('be.disabled');
      cy.get('li > button[aria-label="Go to next page"]').should('not.be.disabled');

      cy.get('li > button[aria-label="Go to next page"]').click();
      cy.wait('@getDonations');
      cy.get('li > button[aria-label="Go to previous page"]').should('not.be.disabled');
      cy.get('li > button[aria-label="Go to next page"]').should('be.disabled');
    });
  });

  describe('Filtering', () => {
    beforeEach(() => {
      cy.forceLogin(hubAdminWithFlags);
      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: hubAdminWithFlags });
      cy.interceptPaginatedDonations();
      cy.visit(DONATIONS_SLUG);
    });

    it('should render expected filters', () => {
      const expectedFilterTestIds = ['status-filter', 'amount-filter'];
      cy.wait('@getDonations');
      expectedFilterTestIds.forEach((testId) => cy.getByTestId(testId).should('exist'));
    });

    it('should display total results', () => {
      cy.wait('@getDonations');
      cy.getByTestId('filter-results-count').should('exist');
    });

    it('should update results to expected amount when filtering status', () => {
      cy.wait('@getDonations');
      const expectedPaids = donationsData.filter((d) => d.status === 'paid');
      cy.getByTestId('status-filter-paid').click();
      cy.getByTestId('filter-results-count').contains(expectedPaids.length);
    });
  });
});
