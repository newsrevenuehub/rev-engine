import isEqual from 'lodash.isequal';
import orderBy from 'lodash.orderby';

import { NO_VALUE } from 'constants/textConstants';
import { PAYMENT_STATUS_EXCLUDE_IN_CONTRIBUTIONS } from 'constants/paymentStatus';
import { DONATIONS_SLUG } from 'routes';
import { USER, LIST_PAGES, getStripeAccountLinkStatusPath } from 'ajax/endpoints';
import { CONTRIBUTIONS_SECTION_ACCESS_FLAG_NAME } from 'constants/featureFlagConstants';

// Data
import donationsData from '../fixtures/donations/18-results.json';
import donationsDataTwoRps from '../fixtures/donations/results-two-rps.json';
import donationsDataOneRp from '../fixtures/donations/results-single-rp.json';

// Utils
import { getFrequencyAdjective } from 'utilities/parseFrequency';
import formatDatetimeForDisplay from 'utilities/formatDatetimeForDisplay';
import formatCurrencyAmount from 'utilities/formatCurrencyAmount';
import toTitleCase from 'utilities/toTitleCase';
import { getEndpoint } from '../support/util';

import hubAdminWithoutFlags from '../fixtures/user/login-success-hub-admin';
import orgAdminUser from '../fixtures/user/login-success-org-admin.json';
import orgAdminUserSingleRP from '../fixtures/user/login-success-org-admin-single-rp.json';
import selfServiceUserNotStripeVerified from '../fixtures/user/self-service-user-not-stripe-verified.json';
import selfServiceUserStripeVerified from '../fixtures/user/self-service-user-stripe-verified.json';

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

const orgAdminOneRpWithAccessFlags = {
  ...orgAdminUserSingleRP['user'],
  flags: [contribSectionsFlag]
};

const orgAdminTwoRpsWithAccessFlags = {
  ...orgAdminUser['user'],
  flags: [contribSectionsFlag]
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
      cy.intercept(getEndpoint(LIST_PAGES), { fixture: 'pages/list-pages-1' }).as('listPages');
      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: hubAdminWithFlags });
      cy.interceptPaginatedDonations();
      cy.visit(DONATIONS_SLUG);
      cy.wait('@listPages');
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
          renderedName: 'Date received',
          rawName: 'first_payment_date',
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
          renderedName: 'Recent payment',
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
      cy.wait('@getDonations');

      // This is hard-coded because trying to assert on the second intercepted
      // response's length is inconsistent--unclear why.
      cy.getByTestId('donations-table').find('tbody tr[data-testid="donation-row"]').should('have.length', 8);
    });

    it('should make donations sortable by payment date', () => {
      const sortedData = orderBy(donationsData, 'last_payment_date');

      cy.wait('@getDonations');
      // will be in ascending order
      cy.getByTestId('donation-header-last_payment_date').click();

      cy.getByTestId('donation-row')
        .first()
        .should('have.attr', 'data-lastpaymentdate', sortedData[0].last_payment_date);
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
      cy.getByTestId('donation-row')
        .first()
        .should('have.attr', 'data-lastpaymentdate', sortedData[sortedData.length - 1].last_payment_date);
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
      const sortedData = orderBy(donationsData, 'amount');

      cy.wait('@getDonations');
      // will be in ascending order
      cy.getByTestId('donation-header-amount').click();
      cy.getByTestId('donation-row').first().should('have.attr', 'data-amount', sortedData[0].amount);
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
      cy.getByTestId('donation-row')
        .first()
        .should('have.attr', 'data-amount', sortedData[sortedData.length - 1].amount);
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

    it('should make contributions sortable by contributor', () => {
      const sortedData = orderBy(donationsData, 'contributor_email');

      cy.wait('@getDonations');
      // will be in ascending order
      cy.getByTestId('donation-header-contributor_email').click();
      cy.getByTestId('donation-row').first().should('have.attr', 'data-donor', sortedData[0].contributor_email);
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
      cy.getByTestId('donation-row')
        .first()
        .should('have.attr', 'data-donor', sortedData[sortedData.length - 1].contributor_email);
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
      const sortedData = orderBy(donationsData, 'status');

      cy.wait('@getDonations');
      // will be in ascending order
      cy.getByTestId('donation-header-status').click();
      cy.getByTestId('donation-row').first().should('have.attr', 'data-status', sortedData[0].status);
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
      cy.getByTestId('donation-row')
        .first()
        .should('have.attr', 'data-status', sortedData[sortedData.length - 1].status);
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
            expect(PAYMENT_STATUS_EXCLUDE_IN_CONTRIBUTIONS.indexOf(row.dataset.status) === -1).to.be.true;
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
      cy.intercept(getEndpoint(LIST_PAGES), { fixture: 'pages/list-pages-1' }).as('listPages');
      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: hubAdminWithFlags });
      cy.interceptPaginatedDonations();
      cy.visit(DONATIONS_SLUG);
      cy.wait('@listPages');
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
      cy.get('button[aria-label="filter by status: paid"]').click();
      cy.getByTestId('filter-results-count').contains(expectedPaids.length);
    });
  });

  describe('Banner', () => {
    it('should not render banner when admin user', () => {
      cy.forceLogin(hubAdminWithFlags);
      cy.intercept(getEndpoint(LIST_PAGES), { fixture: 'pages/list-pages-1' }).as('listPages');
      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: hubAdminWithFlags });
      cy.interceptPaginatedDonations();
      cy.visit(DONATIONS_SLUG);
      cy.wait('@listPages');
      cy.getByTestId('banner').should('not.exist');
    });

    it('should render banner with Stripe message if user has stripe not verified', () => {
      cy.forceLogin({ ...orgAdminUser, user: selfServiceUserNotStripeVerified });
      cy.intercept(getEndpoint(LIST_PAGES), { fixture: 'pages/list-pages-1' }).as('listPages');
      cy.intercept(
        {
          method: 'POST',
          pathname: getEndpoint(getStripeAccountLinkStatusPath(selfServiceUserNotStripeVerified.revenue_programs[0].id))
        },
        { statusCode: 202, body: { requiresVerification: true } }
      ).as('stripeAccountLink');
      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: selfServiceUserNotStripeVerified });
      cy.intercept({ method: 'GET', pathname: getEndpoint('/revenue-programs/*/mailchimp_configure/') }, {});
      cy.interceptPaginatedDonations();
      cy.visit(DONATIONS_SLUG);
      cy.wait('@listPages');
      cy.wait('@stripeAccountLink');
      cy.findByText('connect to Stripe later', { exact: false }).click();
      cy.getByTestId('minimize-toast').click();
      cy.getByTestId('banner').should('exist');
      cy.contains('Looks like you need to set up a Stripe connection');
    });

    it('should render banner with Publish message if user has stripe verified but no live pages', () => {
      cy.forceLogin({ ...orgAdminUser, user: selfServiceUserStripeVerified });
      cy.intercept(getEndpoint(LIST_PAGES), { fixture: 'pages/list-pages-1' }).as('listPages');
      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: selfServiceUserStripeVerified });
      cy.intercept({ method: 'GET', pathname: getEndpoint('/revenue-programs/*/mailchimp_configure/') }, {});
      cy.interceptPaginatedDonations();
      cy.visit(DONATIONS_SLUG);
      cy.wait('@listPages');
      cy.getByTestId('banner').should('exist');
      cy.contains('Looks like you need to publish a contribution page in');
    });

    it('should not render banner if user has stripe verified and live pages', () => {
      cy.forceLogin({ ...orgAdminUser, user: selfServiceUserStripeVerified });
      cy.intercept(getEndpoint(LIST_PAGES), { fixture: 'pages/list-pages-1-live' }).as('listPages');
      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: selfServiceUserStripeVerified });
      cy.intercept({ method: 'GET', pathname: getEndpoint('/revenue-programs/*/mailchimp_configure/') }, {});
      cy.interceptPaginatedDonations();
      cy.visit(DONATIONS_SLUG);
      cy.wait('@listPages');
      cy.getByTestId('banner').should('not.exist');
    });

    it('should not render banner if user has multiple RP', () => {
      cy.forceLogin(orgAdminUser);
      cy.intercept(getEndpoint(LIST_PAGES), { fixture: 'pages/list-pages-1' }).as('listPages');
      cy.intercept(
        { method: 'GET', pathname: getEndpoint(USER) },
        {
          body: {
            ...selfServiceUserStripeVerified,
            revenue_programs: orgAdminUser.user.revenue_programs
          }
        }
      );
      cy.intercept({ method: 'GET', pathname: getEndpoint('/revenue-programs/*/mailchimp_configure/') }, {});
      cy.interceptPaginatedDonations();
      cy.visit(DONATIONS_SLUG);
      cy.wait('@listPages');
      cy.getByTestId('banner').should('not.exist');
    });
  });
});

describe('Table sorting for revenue program name', () => {
  // Tests in this block assert about column headers and we want to ensure all are visible
  // without having to scroll, so setting view port size here to accomodate all.

  beforeEach(() => {
    cy.viewport('macbook-16');
  });
  specify('user has access to a single RP', () => {
    cy.forceLogin(orgAdminUserSingleRP);
    cy.intercept(getEndpoint(LIST_PAGES), { fixture: 'pages/list-pages-1' }).as('listPages');
    cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: orgAdminOneRpWithAccessFlags });
    cy.intercept({ method: 'GET', pathname: getEndpoint('/revenue-programs/*/mailchimp_configure/') }, {});
    cy.interceptPaginatedDonations(donationsDataOneRp);
    cy.visit(DONATIONS_SLUG);
    cy.wait('@getDonations');
    ['Date received', 'Amount', 'Frequency', 'Recent payment', 'Contributor', 'Payment status'].forEach((name) => {
      cy.findByRole('columnheader', { name: `Sort by ${name}` }).should('be.visible');
    });
    cy.findByRole('columnheader', { name: 'Sort by revenue program' }).should('not.exist');
  });
  specify('user has access to more than one RP', () => {
    cy.forceLogin(orgAdminTwoRpsWithAccessFlags);
    cy.intercept(getEndpoint(LIST_PAGES), { fixture: 'pages/list-pages-1' }).as('listPages');
    cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: orgAdminTwoRpsWithAccessFlags });
    cy.intercept({ method: 'GET', pathname: getEndpoint('/revenue-programs/*/mailchimp_configure/') }, {});
    cy.interceptPaginatedDonations(donationsDataTwoRps);
    cy.visit(DONATIONS_SLUG);
    cy.wait('@getDonations');
    [
      'Date received',
      'Amount',
      'Frequency',
      'Recent payment',
      'Revenue program',
      'Contributor',
      'Payment status'
    ].forEach((name) => {
      cy.findByRole('columnheader', { name: `Sort by ${name}` }).should('be.visible');
    });
    // it's sortable
    cy.findByRole('columnheader', { name: 'Sort by Revenue program' }).click();
    cy.wait('@getDonations');
    cy.getByTestId('donation-row').should(($rows) => {
      const rows = $rows.toArray();
      rows
        .filter((row, index) => index > 0)
        .forEach((row, index) => {
          // index will be the previous row, because we filter out the first item.
          expect(row.dataset.revenueprogram >= rows[index].dataset.revenueprogram).to.be.true;
        });
    });
  });
});
