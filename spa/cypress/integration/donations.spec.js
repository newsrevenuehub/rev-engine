import isEqual from 'lodash.isequal';

import formatDatetimeForDisplay from 'utilities/formatDatetimeForDisplay';
import formatCurrencyAmount from 'utilities/formatCurrencyAmount';
import donationsData from '../fixtures/donations/18-results.json';

describe('Donation page', () => {
  beforeEach(() => {
    cy.login('user/stripe-verified.json');
    cy.getPaginatedDonations();
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
        transform: (rawVal) => (rawVal ? formatDatetimeForDisplay(rawVal) : missingValueString)
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
        transform: (rawVal) => (rawVal ? formatDatetimeForDisplay(rawVal) : missingValueString)
      },
      {
        rawName: 'id',
        renderedName: '',
        transform: (rawVal) => 'Details...'
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
  it('should link to donation detail page for each donation in list', () => {
    cy.wait('@getDonations');
    cy.getByTestId('donation-row').each((row) => {
      expect(row.find('td[data-testcolumnaccessor="id"] > a').attr('href')).to.equal(
        `/dashboard/donations/${row.attr('data-donationid')}/`
      );
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
      cy.getByTestId('total-results').contains(intercept.response.body.count);
    });
  });

  it('should have working page controls', () => {
    cy.wait('@getDonations');
    // initial state when 2 pages
    cy.getByTestId('previous-page').should('be.disabled');
    cy.getByTestId('next-page').should('not.be.disabled');

    cy.getByTestId('next-page').click();
    cy.getByTestId('previous-page').should('not.be.disabled');
    cy.getByTestId('next-page').should('be.disabled');
  });
});
