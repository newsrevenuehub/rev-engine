import isEqual from 'lodash.isequal';

import { DONATIONS } from 'ajax/endpoints';
import { getEndpoint } from '../support/util';

import { formatCurrencyAmount, formatDateTime } from 'components/donations/utils';
import { DEFAULT_RESULTS_ORDERING } from 'components/donations/Donations';
import { ApiResourceList } from '../support/restApi';
import donationsData from '../fixtures/donations/18-results.json';

describe('Donation page', () => {
  beforeEach(() => {
    cy.login('user/stripe-verified.json');
    const defaultSortBys = {
      columns: DEFAULT_RESULTS_ORDERING.map((item) => item.id),
      directions: DEFAULT_RESULTS_ORDERING.map((item) => (item.desc ? 'desc' : 'asc'))
    };
    const sortableColumns = ['last_payment_date', 'amount', 'contributor_email', 'modified', 'status', 'flagged_date'];
    const api = new ApiResourceList(donationsData, defaultSortBys, sortableColumns);
    cy.intercept(`${getEndpoint(DONATIONS)}**`, (req) => {
      const urlSearchParams = new URLSearchParams(req.url.split('?')[1]);
      const pageSize = urlSearchParams.get('page_size');
      const pageNum = urlSearchParams.get('page');
      const ordering = urlSearchParams.get('ordering');
      req.reply(api.getResponse(pageSize, pageNum, ordering));
    }).as('getDonations');
    cy.visit('/dashboard/donations/');
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
        expect(cellVal).to.equal(transform(dataVal));
      });
    });
  });
  it('should display the second page of donations when click on next page', () => {
    cy.wait('@getDonations');
    cy.getByTestId('next-page').click();
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

  it('should make donations sortable by flagged date', () => {
    cy.wait('@getDonations');
    // will be in ascending order
    cy.getByTestId('donation-header-flagged_date').click();
    cy.wait('@getDonations');
    cy.getByTestId('donation-row').should(($rows) => {
      const rows = $rows.toArray();
      rows
        .filter((row, index) => index > 0)
        .forEach((row, index) => {
          // index will be the previous row, because we filter out the first item.
          expect(row.dataset.flaggeddate >= rows[index].dataset.flaggeddate).to.be.true;
        });
    });
    // will be in descending order
    cy.getByTestId('donation-header-flagged_date').click();
    cy.wait('@getDonations');
    cy.getByTestId('donation-row').should(($rows) => {
      const rows = $rows.toArray();
      rows
        .filter((row, index) => index > 0)
        .forEach((row, index) => {
          // index will be the previous row, because we filter out the first item.
          expect(row.dataset.flaggeddate <= rows[index].dataset.flaggeddate).to.be.true;
        });
    });
  });

  it('should display the total number of results', () => {
    cy.wait('@getDonations').then((intercept) => {
      cy.getByTestId('total-results').contains(`${intercept.response.body.count} total results`);
    });
  });

  it('should display the current page and total pages', () => {
    cy.wait('@getDonations').then((intercept) => {
      const { page, count, page_size: pageSize } = intercept.response.body;
      cy.getByTestId('page-number').contains(page.toString());
      cy.getByTestId('page-total').contains(Math.ceil(count / pageSize).toString());
    });
  });

  it('should have working page controls', () => {
    cy.wait('@getDonations');
    // initial state when 2 pages
    cy.getByTestId('first-page').should('be.disabled');
    cy.getByTestId('previous-page').should('be.disabled');
    cy.getByTestId('next-page').should('not.be.disabled');
    cy.getByTestId('last-page').should('not.be.disabled');

    // show when go to page 2 of 2 using next-page
    cy.getByTestId('next-page').click();
    cy.wait('@getDonations');
    cy.getByTestId('next-page').should('be.disabled');
    cy.getByTestId('last-page').should('be.disabled');
    cy.getByTestId('first-page').should('not.be.disabled');
    cy.getByTestId('previous-page').should('not.be.disabled');

    // show when go back to page 1 using first-page
    cy.getByTestId('first-page').click();
    cy.wait('@getDonations');
    cy.getByTestId('first-page').should('be.disabled');
    cy.getByTestId('previous-page').should('be.disabled');
    cy.getByTestId('next-page').should('not.be.disabled');
    cy.getByTestId('last-page').should('not.be.disabled');

    // show when go to last page using last-page
    cy.getByTestId('last-page').click();
    cy.getByTestId('next-page').should('be.disabled');
    cy.getByTestId('last-page').should('be.disabled');
    cy.getByTestId('first-page').should('not.be.disabled');
    cy.getByTestId('previous-page').should('not.be.disabled');

    // show when go to page one using previous-page
    cy.getByTestId('previous-page').click();
    cy.wait('@getDonations');
    cy.getByTestId('first-page').should('be.disabled');
    cy.getByTestId('previous-page').should('be.disabled');
    cy.getByTestId('next-page').should('not.be.disabled');
    cy.getByTestId('last-page').should('not.be.disabled');

    cy.getByTestId('go-to-page').type('1');
    cy.wait('@getDonations');
    cy.getByTestId('first-page').should('be.disabled');
    cy.getByTestId('previous-page').should('be.disabled');
    cy.getByTestId('next-page').should('not.be.disabled');
    cy.getByTestId('last-page').should('not.be.disabled');
  });
});
