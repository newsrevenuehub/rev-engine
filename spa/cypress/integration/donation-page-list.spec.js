import { LIST_PAGES, REVENUE_PROGRAMS, TEMPLATES } from 'ajax/endpoints';
import { CONTENT_SLUG } from 'routes';
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

    cy.visit(CONTENT_SLUG);
    cy.url().should('include', CONTENT_SLUG);
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

    it('should show message if there are no revenue programs', () => {
      // override intercept set in beforeEach cause for this case we don't want any programs present
      cy.intercept(
        { method: 'GET', pathname: getEndpoint(REVENUE_PROGRAMS) },
        { body: { results: [] }, statusCode: 200 }
      );
      cy.getByTestId('page-create-button').click();
      cy.contains('You need to set up a revenue program to create a page.');
    });

    it('should show select if rev programs present', () => {
      cy.getByTestId('page-create-button').click();
      cy.contains('Choose a revenue program');
    });

    it('should add suggested slug on name field blur', () => {
      cy.getByTestId('page-create-button').click();
      cy.getByTestId('page-name').type('My Testing Page');
      cy.getByTestId('page-name').blur();
      cy.getByTestId('page-slug').should('have.value', 'my-testing-page');
    });

    it('should show template list dropdown, if templates exist', () => {
      cy.intercept(
        { method: 'GET', pathname: getEndpoint(TEMPLATES) },
        { fixture: 'pages/templates.json', statusCode: 200 }
      );
      cy.getByTestId('page-create-button').click();
      cy.getByTestId('template-picker').should('exist');
    });

    it('should contain rev_program_pk and template_pk in outoing request', () => {
      cy.intercept(
        { method: 'GET', pathname: getEndpoint(REVENUE_PROGRAMS) },
        { fixture: 'org/revenue-programs-1.json', statusCode: 200 }
      ).as('getRevPrograms');
      cy.intercept(
        { method: 'GET', pathname: getEndpoint(TEMPLATES) },
        { fixture: 'pages/templates.json', statusCode: 200 }
      ).as('getTemplates');
      cy.getByTestId('page-create-button').click();
      cy.wait(['@getRevPrograms', '@getTemplates']);
      cy.getByTestId('page-name').type('My Testing Page');
      cy.getByTestId('page-name').blur();
      cy.getByTestId('revenue-program-picker').click();
      cy.getByTestId('select-item-0').click();
      cy.getByTestId('template-picker').click();
      cy.getByTestId('select-item-0').click();

      cy.intercept({ method: 'POST', pathname: getEndpoint(LIST_PAGES) }).as('createNewPage');
      cy.getByTestId('save-new-page-button').click();
      cy.wait('@createNewPage').then(({ request }) => {
        expect(request.body).to.have.property('revenue_program_pk');
        expect(request.body).to.have.property('template_pk');
      });
    });
  });
});
