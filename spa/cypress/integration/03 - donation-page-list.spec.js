import { LIST_PAGES, REVENUE_PROGRAMS, USER } from 'ajax/endpoints';
import { CONTENT_SLUG } from 'routes';
import { getEndpoint } from '../support/util';
import orgAdmin from '../fixtures/user/login-success-org-admin.json';
import stripeVerifiedOrgAdmin from '../fixtures/user/self-service-user-stripe-verified.json';
import { CONTENT_SECTION_ACCESS_FLAG_NAME } from 'constants/featureFlagConstants';

const contentSectionFlag = {
  id: '5678',
  name: CONTENT_SECTION_ACCESS_FLAG_NAME
};

const orgAdminWithContentFlag = {
  ...orgAdmin['user'],
  flags: [contentSectionFlag]
};

describe('Donation page list', () => {
  beforeEach(() => {
    cy.intercept(
      { method: 'GET', pathname: getEndpoint(LIST_PAGES) },
      { fixture: 'pages/list-pages-1', statusCode: 200 }
    ).as('listPages');
    cy.intercept(
      { method: 'GET', pathname: getEndpoint(REVENUE_PROGRAMS) },
      { fixture: 'org/revenue-programs-1', statusCode: 200 }
    );
  });

  it('should render pages list', () => {
    cy.forceLogin(orgAdmin);
    cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: orgAdminWithContentFlag });
    cy.visit(CONTENT_SLUG);
    cy.url().should('include', CONTENT_SLUG);
    cy.wait('@listPages');
    cy.getByTestId('pages-list').should('exist');
  });

  describe('Add Page modal', () => {
    it('should open when the user clicks the New Page button', () => {
      cy.forceLogin(orgAdmin);
      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: orgAdminWithContentFlag });
      cy.visit(CONTENT_SLUG);
      cy.url().should('include', CONTENT_SLUG);
      cy.wait('@listPages');
      cy.get('button[aria-label="New Page"]').click();
      cy.getByTestId('page-create-modal');
      cy.contains('Choose a revenue program');
    });

    it('should show message if there are no revenue programs and user tries to create', () => {
      cy.intercept(
        { method: 'GET', pathname: getEndpoint(USER) },
        { body: { ...stripeVerifiedOrgAdmin, revenue_programs: [] } }
      );
      cy.forceLogin({
        ...orgAdmin,
        user: { ...orgAdmin.user, revenue_programs: [] }
      });
      cy.visit(CONTENT_SLUG);
      cy.url().should('include', CONTENT_SLUG);
      cy.wait('@listPages');
      cy.get('button[aria-label="New Page"]').click();
      cy.contains('You need to set up a revenue program to create a page.');
    });

    it('should contain rev_program in outgoing request', () => {
      cy.forceLogin(orgAdmin);
      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: orgAdminWithContentFlag });
      cy.visit(CONTENT_SLUG);
      cy.get('button[aria-label="New Page"]').click();
      cy.getByTestId('page-name').type('My Testing Page');
      cy.getByTestId('page-name').blur();
      cy.getByTestId('revenue-program-picker').click();
      cy.getByTestId('select-item-0').click();
      cy.intercept({ method: 'POST', pathname: getEndpoint(LIST_PAGES) }).as('createNewPage');
      cy.getByTestId('save-new-page-button').click({ force: true });
      cy.wait('@createNewPage').then(({ request }) => expect(request.body).to.have.property('revenue_program'));
    });
  });
});
