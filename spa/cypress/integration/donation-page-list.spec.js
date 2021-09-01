import { LIST_PAGES, REVENUE_PROGRAMS } from 'ajax/endpoints';
import { PAGES_SLUG } from 'routes';
import { getEndpoint } from '../support/util';

describe('Donation page list', () => {
  beforeEach(() => {
    cy.login('user/stripe-verified.json');
    cy.intercept(
      { method: 'GET', pathname: getEndpoint(LIST_PAGES) },
      { fixture: 'pages/list-pages-1', statusCode: 200 }
    ).as('listPages');

    cy.intercept(
      { method: 'GET', pathname: getEndpoint(REVENUE_PROGRAMS) },
      { fixture: 'org/revenue-programs-1', statusCode: 200 }
    );

    cy.visit(PAGES_SLUG);
    cy.url().should('include', PAGES_SLUG);
    cy.wait('@listPages');
  });

  it('should render pages list', () => {
    cy.getByTestId('pages-list').should('exist');
  });

  describe('Donation page create', () => {
    it('should render page creation modal', () => {
      cy.getByTestId('page-create-button').click();
      cy.getByTestId('page-create-modal');
    });

    it('should ask if user wants to create rev program if none present', () => {
      // override intercept set in beforeEach cause for this case we don't want any programs present
      cy.intercept(
        { method: 'GET', pathname: getEndpoint(REVENUE_PROGRAMS) },
        { body: { results: [] }, statusCode: 200 }
      );
      cy.getByTestId('page-create-button').click();
      cy.contains('You need to set up a revenue program to create a page. Create one?');
    });

    it('should show select if rev programs present', () => {
      cy.getByTestId('page-create-button').click();
      cy.contains('Select a revenue program');
    });

    it('should add suggested slug on name field blur', () => {
      cy.getByTestId('page-create-button').click();
      cy.getByTestId('page-name').type('My Testing Page');
      cy.getByTestId('page-name').blur();
      cy.getByTestId('page-slug').should('have.value', 'my-testing-page');
    });
  });
});
