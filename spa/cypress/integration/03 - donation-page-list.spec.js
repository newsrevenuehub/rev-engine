import { LIST_PAGES, TEMPLATES } from 'ajax/endpoints';
import { CONTENT_SLUG } from 'routes';
import { getEndpoint } from '../support/util';
import { generatePath } from 'react-router-dom';

// Fixtures
import hubAdmin from '../fixtures/user/hub-admin.json';

const { organizations, revenue_programs } = hubAdmin.user;
const targetOrg = organizations[0];
const targetRP = revenue_programs.find((rp) => rp.organization === targetOrg.id);
const targetUrl = generatePath(CONTENT_SLUG, {
  orgSlug: targetOrg.slug,
  revProgramSlug: targetRP.slug
});

describe('Donation page list', () => {
  beforeEach(() => {
    cy.login('user/hub-admin.json');
    cy.intercept(
      { method: 'GET', pathname: getEndpoint(LIST_PAGES) },
      { fixture: 'pages/list-pages-1', statusCode: 200 }
    ).as('listPages');

    cy.visit(targetUrl);
    cy.url().should('include', targetUrl);
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

    it('should contain and template_pk in outoing request', () => {
      cy.intercept(
        { method: 'GET', pathname: getEndpoint(TEMPLATES) },
        { fixture: 'pages/templates.json', statusCode: 200 }
      ).as('getTemplates');
      cy.getByTestId('page-create-button').click();
      cy.wait('@getTemplates');
      cy.getByTestId('page-name').type('My Testing Page');
      cy.getByTestId('page-name').blur();
      cy.getByTestId('template-picker').click();
      cy.getByTestId('select-item-0').click();

      cy.intercept({ method: 'POST', pathname: getEndpoint(LIST_PAGES) }).as('createNewPage');
      cy.getByTestId('save-new-page-button').click({ force: true });
      cy.wait('@createNewPage').then(({ request }) => {
        expect(request.body).to.have.property('template_pk');
      });
    });
  });
});
