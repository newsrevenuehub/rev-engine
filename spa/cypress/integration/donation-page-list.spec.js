import { LIST_PAGES, REVENUE_PROGRAMS } from 'ajax/endpoints';
import { PAGES_SLUG } from 'routes';
import { getEndpoint } from '../support/util';

describe('Donation page list', () => {
  before(() => {
    cy.login('user/stripe-verified.json');
    cy.intercept(
      { method: 'GET', pathname: getEndpoint(LIST_PAGES) },
      { fixture: 'pages/list-pages-1', statusCode: 200 }
    );

    cy.visit(PAGES_SLUG);
  });

  it('should render pages list', () => {
    cy.getByTestId('pages-list');
  });

  describe('Donation page create', () => {
    before(() => {
      cy.getByTestId('page-create-button').click();
    });

    it('should render page creation modal', () => {
      cy.getByTestId('page-create-modal');
    });

    it('should ask if user wants to create rev program if none present', () => {
      cy.contains('You need to set up a revenue program to create a page. Create one?');
    });

    it('should show select if rev programs present', () => {
      cy.getByTestId('close-modal').click();
      cy.intercept(
        { method: 'GET', pathname: getEndpoint(REVENUE_PROGRAMS) },
        { fixture: 'org/revenue-programs-1', statusCode: 200 }
      );
      cy.getByTestId('page-create-button').click();
      cy.contains('Select a revenue program');
    });

    it('should add suggested slug on name field blur', () => {
      cy.getByTestId('page-name').type('My Testing Page');
      cy.getByTestId('page-name').blur();
      cy.getByTestId('page-slug').should('have.value', 'my-testing-page');
    });
  });
});
