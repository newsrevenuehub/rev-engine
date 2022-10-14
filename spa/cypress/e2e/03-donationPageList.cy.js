import { LIST_PAGES, REVENUE_PROGRAMS, USER, DRAFT_PAGE_DETAIL, PATCH_PAGE, LIST_STYLES } from 'ajax/endpoints';
import { CONTENT_SLUG } from 'routes';
import { getEndpoint } from '../support/util';
import orgAdmin from '../fixtures/user/login-success-org-admin.json';
import stripeVerifiedOrgAdmin from '../fixtures/user/self-service-user-stripe-verified.json';

describe('Pages view', () => {
  beforeEach(() => {
    cy.intercept(
      { method: 'GET', pathname: getEndpoint(REVENUE_PROGRAMS) },
      { fixture: 'org/revenue-programs-1', statusCode: 200 }
    );
    cy.forceLogin(orgAdmin);
  });

  it('has prototypical first-time self-service user flow', () => {
    cy.intercept({ method: 'GET', pathname: getEndpoint(LIST_PAGES) }, { body: [], statusCode: 200 }).as('listPages');
    cy.intercept({ method: 'GET', pathname: getEndpoint(LIST_STYLES + '/') }, { body: [], statusCode: 200 }).as(
      'listStyles'
    );
    cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: stripeVerifiedOrgAdmin });
    cy.intercept({ method: 'POST', pathname: getEndpoint(LIST_PAGES) }, { body: {} }).as('createNewPage');
    cy.intercept(
      { method: 'GET', pathname: getEndpoint(`${DRAFT_PAGE_DETAIL}/**`) },
      {
        fixture: 'pages/live-page-element-validation'
      }
    ).as('draftPage');
    cy.intercept({ method: 'PATCH', pathname: getEndpoint(`${PATCH_PAGE}/**`) }, { fixture: 'pages/patch-page' }).as(
      'patchPage'
    );
    cy.visit(CONTENT_SLUG);
    cy.url().should('include', CONTENT_SLUG);
    cy.wait('@listPages');
    cy.getByTestId('pages-list').should('exist');
    cy.getByTestId('new-page-button').should('exist');
    cy.getByTestId('new-page-button').click();
    cy.wait('@createNewPage');
    cy.wait('@draftPage');
    cy.getByTestId('publish-button').click();
    cy.getByTestId('page-name-input').type('donate');
    cy.getByTestId('modal-publish-button').click();
    cy.wait('@patchPage');
    cy.getByTestId('page-creation-success-evidence');
    cy.getByTestId('copy-contribution-page-link').click();
  });
});
