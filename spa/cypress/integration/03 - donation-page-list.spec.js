import { LIST_PAGES, REVENUE_PROGRAMS, TEMPLATES } from 'ajax/endpoints';
import { CONTENT_SLUG } from 'routes';
import { getEndpoint } from '../support/util';
import rpUser from '../fixtures/user/rp-admin.json';
import { LS_USER } from 'settings';

describe('Donation page list', () => {
  beforeEach(() => {
    cy.forceLogin(rpUser);
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

  it('should render page creation modal when click page create button', () => {
    cy.getByTestId('page-create-button').click();
    cy.getByTestId('page-create-modal');
    cy.contains('Choose a revenue program');
  });

  it('should add suggested slug on name field blur', () => {
    cy.getByTestId('page-create-button').click();
    cy.getByTestId('page-name').type('My Testing Page');
    cy.getByTestId('page-name').blur();
    cy.getByTestId('page-slug').should('have.value', 'my-testing-page');
  });

  it('should show message if there are no revenue programs and user tries to create', () => {
    cy.setLocalStorage(LS_USER, JSON.stringify({ ...LS_USER, revenue_programs: [] }));
    cy.getByTestId('page-create-button').click();
    cy.contains('You need to set up a revenue program to create a page.');
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
      { method: 'GET', pathname: getEndpoint(TEMPLATES) },
      { fixture: 'pages/templates.json', statusCode: 200 }
    ).as('getTemplates');
    cy.getByTestId('page-create-button').click();
    cy.wait('@getTemplates');
    cy.getByTestId('page-name').type('My Testing Page');
    cy.getByTestId('page-name').blur();
    cy.getByTestId('revenue-program-picker').click();
    cy.getByTestId('select-item-0').click();
    cy.getByTestId('template-picker').click();
    cy.getByTestId('select-item-0').click();

    cy.intercept({ method: 'POST', pathname: getEndpoint(LIST_PAGES) }).as('createNewPage');
    cy.getByTestId('save-new-page-button').click({ force: true });
    cy.wait('@createNewPage').then(({ request }) => {
      expect(request.body).to.have.property('revenue_program_pk');
      expect(request.body).to.have.property('template_pk');
    });
  });
});
