import { DRAFT_PAGE_DETAIL, LIST_PAGES, REVENUE_PROGRAMS, USER, PATCH_PAGE, LIST_STYLES } from 'ajax/endpoints';
import { CONTENT_SLUG } from 'routes';
import { getEndpoint } from '../support/util';
import orgAdmin from '../fixtures/user/login-success-org-admin.json';
import stripeVerifiedOrgAdmin from '../fixtures/user/self-service-user-stripe-verified.json';
import createPageResponse from '../fixtures/pages/create-page-response.json';
import { CONTENT_SECTION_ACCESS_FLAG_NAME } from 'constants/featureFlagConstants';

const contentSectionFlag = {
  id: '5678',
  name: CONTENT_SECTION_ACCESS_FLAG_NAME
};

const orgAdminWithContentFlag = {
  ...orgAdmin.user,
  flags: [contentSectionFlag]
};

describe('Pages view', () => {
  it('has prototypical first-time self-service user flow', () => {
    cy.intercept(
      { method: 'GET', pathname: getEndpoint(REVENUE_PROGRAMS) },
      { fixture: 'org/revenue-programs-1', statusCode: 200 }
    );
    cy.intercept({ method: 'GET', pathname: getEndpoint(LIST_PAGES) }, { body: [], statusCode: 200 }).as('listPages');
    cy.forceLogin(orgAdmin);
    cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: orgAdminWithContentFlag });
    cy.intercept({ method: 'GET', pathname: getEndpoint('/revenue-programs/*/mailchimp_configure/') }, {});
    cy.intercept({ method: 'GET', pathname: getEndpoint(LIST_STYLES + '/') }, { body: [], statusCode: 200 }).as(
      'listStyles'
    );
    cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: stripeVerifiedOrgAdmin });
    cy.intercept({ method: 'GET', pathname: getEndpoint('/revenue-programs/*/mailchimp_configure/') }, {});
    cy.intercept(
      { method: 'POST', pathname: getEndpoint(LIST_PAGES) },
      { fixture: 'pages/create-page-response.json' }
    ).as('createNewPage');
    cy.intercept(
      {
        method: 'GET',
        pathname: getEndpoint(DRAFT_PAGE_DETAIL),
        query: {
          revenue_program: createPageResponse.revenue_program.slug
        }
      },
      { fixture: 'pages/live-page-element-validation' }
    ).as('getNewPage');
    cy.intercept(
      {
        method: 'GET',
        pathname: getEndpoint(LIST_PAGES + createPageResponse.id)
      },
      { fixture: 'pages/create-page-response.json' }
    ).as('draftPageById');
    cy.intercept({ method: 'PATCH', pathname: getEndpoint(`${PATCH_PAGE}/**`) }, { fixture: 'pages/patch-page' }).as(
      'patchPage'
    );
    cy.visit(CONTENT_SLUG);
    cy.url().should('include', CONTENT_SLUG);
    cy.wait('@listPages');
    cy.getByTestId('pages-list').should('exist');
    cy.findByRole('button', { name: 'New Page' }).should('exist');
    cy.findByRole('button', { name: 'New Page' }).click();
    cy.wait('@createNewPage');
    cy.wait('@draftPageById');
    cy.getByTestId('publish-button').click();
    cy.findByRole('textbox', { name: 'Page Name' }).type('donate');
    cy.findByRole('button', { name: 'Publish' }).click();
    cy.wait('@patchPage');
    cy.getByTestId('page-creation-success-evidence');
    cy.getByTestId('copy-contribution-page-link').click();
  });
});
