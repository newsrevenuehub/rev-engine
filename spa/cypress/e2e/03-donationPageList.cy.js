import { DRAFT_PAGE_DETAIL, LIST_PAGES, REVENUE_PROGRAMS, USER, PATCH_PAGE, LIST_STYLES } from 'ajax/endpoints';
import { CONTENT_SLUG } from 'routes';
import { getEndpoint } from '../support/util';
import orgAdmin from '../fixtures/user/login-success-org-admin.json';
import orgAdminNoRP from '../fixtures/user/login-success-org-admin-verified-norp.json';
import stripeVerifiedOrgAdmin from '../fixtures/user/self-service-user-stripe-verified.json';
import createPageResponse from '../fixtures/pages/create-page-response.json';
import { CONTENT_SECTION_ACCESS_FLAG_NAME } from 'constants/featureFlagConstants';
import { LS_USER } from 'appSettings';

const contentSectionFlag = {
  id: '5678',
  name: CONTENT_SECTION_ACCESS_FLAG_NAME
};

const orgAdminWithContentFlag = {
  ...orgAdmin.user,
  flags: [contentSectionFlag]
};

const orgAdminWithContentFlagAndOneRP = {
  ...orgAdminWithContentFlag,
  revenue_programs: [orgAdminWithContentFlag.revenue_programs[0]]
};

const orgAdminWithContentFlagAndNoRPs = {
  ...orgAdminNoRP.user,
  flags: [contentSectionFlag]
};

describe('Contribution page list', () => {
  describe('When the user has a revenue program', () => {
    beforeEach(() => {
      cy.forceLogin(orgAdmin);
      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: orgAdminWithContentFlag });
      cy.intercept({ method: 'GET', pathname: getEndpoint('/revenue-programs/*/mailchimp-integration/') }, {});
      cy.intercept(
        { method: 'GET', pathname: getEndpoint(LIST_PAGES) },
        { fixture: 'pages/list-pages-1', statusCode: 200 }
      ).as('listPages');
      cy.intercept(
        { method: 'GET', pathname: getEndpoint(REVENUE_PROGRAMS) },
        { fixture: 'org/revenue-programs-1', statusCode: 200 }
      );
    });

    it('shows a list of pages', () => {
      cy.visit(CONTENT_SLUG);
      cy.url().should('include', CONTENT_SLUG);
      cy.wait('@listPages');
      cy.getByTestId('pages-list').should('exist');
    });
  });
  describe('When the user has no revenue programs', () => {
    beforeEach(() => {
      cy.forceLogin(orgAdmin);
      cy.intercept(
        { method: 'GET', pathname: getEndpoint(LIST_PAGES) },
        { fixture: 'pages/list-pages-1', statusCode: 200 }
      ).as('listPages');

      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: orgAdminWithContentFlagAndNoRPs });
      cy.visit(CONTENT_SLUG);
      cy.url().should('include', CONTENT_SLUG);
      cy.wait('@listPages');
    });

    it('shows a list of pages', () => {
      cy.getByTestId('pages-list').should('exist');
    });
  });
});

describe('Add Page modal', () => {
  beforeEach(() => cy.forceLogin(orgAdmin));

  it('opens when the user clicks the New Page button', () => {
    cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: orgAdminWithContentFlag });
    cy.intercept({ method: 'GET', pathname: getEndpoint('/revenue-programs/*/mailchimp-integration/') }, {});
    cy.intercept(
      { method: 'GET', pathname: getEndpoint(LIST_PAGES) },
      { fixture: 'pages/list-pages-1', statusCode: 200 }
    ).as('listPages');
    cy.visit(CONTENT_SLUG);
    cy.url().should('include', CONTENT_SLUG);
    cy.wait('@listPages');
    cy.getByTestId('new-page-button').click();
    cy.getByTestId('page-create-modal');
    cy.contains('Select the Revenue Program for this new page.');
  });

  it('puts the rev_program in the outgoing request', () => {
    cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: orgAdminWithContentFlag });
    cy.intercept({ method: 'GET', pathname: getEndpoint('/revenue-programs/*/mailchimp-integration/') }, {});
    cy.intercept(
      { method: 'GET', pathname: getEndpoint(LIST_PAGES) },
      { fixture: 'pages/list-pages-1', statusCode: 200 }
    ).as('listPages');
    cy.visit(CONTENT_SLUG);
    cy.getByTestId('new-page-button').click();
    cy.getByTestId('new-page-revenue-program').click();
    cy.getByTestId('select-revenue-program-0').click();
    cy.intercept({ method: 'POST', pathname: getEndpoint(LIST_PAGES) }).as('createNewPage');
    cy.getByTestId('new-page-submit').click({ force: true });
    cy.wait('@createNewPage').then(({ request }) => expect(request.body).to.have.property('revenue_program'));
  });

  describe('when the user has only one revenue program', () => {
    beforeEach(() => {
      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: orgAdminWithContentFlagAndOneRP });
      cy.intercept({ method: 'GET', pathname: getEndpoint('/revenue-programs/*/mailchimp-integration/') }, {});
    });

    it('immediately creates a page with a temporary slug', () => {
      cy.intercept({ method: 'GET', pathname: getEndpoint(LIST_PAGES) }, { body: [], statusCode: 200 }).as('listPages');
      cy.intercept({ method: 'POST', pathname: getEndpoint(LIST_PAGES) }).as('createNewPage');
      cy.visit(CONTENT_SLUG);
      cy.getByTestId('new-page-button').click();
      cy.wait('@createNewPage').then(({ request }) => {
        expect(request.body).to.eql({
          name: 'Some Rev Program Page 1',
          revenue_program: 1,
          slug: 'some-rev-program-page-1'
        });
      });
    });

    it('immediately creates a page with a unique name and slug based on existing pages', () => {
      cy.intercept(
        { method: 'GET', pathname: getEndpoint(LIST_PAGES) },
        { fixture: 'pages/list-pages-1', statusCode: 200 }
      ).as('listPages');
      cy.intercept({ method: 'POST', pathname: getEndpoint(LIST_PAGES) }, { statusCode: 200 }).as('createNewPage');
      cy.visit(CONTENT_SLUG);
      cy.wait('@listPages');
      cy.getByTestId('new-page-button').click();
      cy.wait('@createNewPage').then(({ request }) => {
        expect(request.body).to.eql({
          name: 'Some Rev Program Page 2',
          revenue_program: 1,
          slug: 'some-rev-program-page-2'
        });
      });
    });

    it('redirects the user to the newly-created page', () => {
      cy.intercept(
        { method: 'GET', pathname: getEndpoint(LIST_PAGES) },
        { fixture: 'pages/list-pages-1', statusCode: 200 }
      ).as('listPages');
      cy.intercept(
        { method: 'POST', pathname: getEndpoint(LIST_PAGES) },
        {
          body: {
            id: 1,
            slug: 'page-1',
            revenue_program: {
              slug: 'rp-1'
            }
          },
          statusCode: 200
        }
      ).as('createNewPage');
      cy.visit(CONTENT_SLUG);
      cy.getByTestId('new-page-button').click();
      cy.wait('@createNewPage');
      cy.url().should('include', 'edit/pages/1');
    });

    it('shows an error if creating the page fails', () => {
      cy.intercept(
        { method: 'GET', pathname: getEndpoint(LIST_PAGES) },
        { fixture: 'pages/list-pages-1', statusCode: 200 }
      ).as('listPages');
      cy.intercept(
        { method: 'POST', pathname: getEndpoint(LIST_PAGES) },
        {
          body: ['Create page error'],
          statusCode: 400
        }
      ).as('createNewPage');
      cy.visit(CONTENT_SLUG);
      cy.getByTestId('new-page-button').click();
      cy.wait('@createNewPage');
      cy.contains('There was an error and we could not create your new page. We have been notified.');
    });
  });
});

describe('Pages view', () => {
  it('has prototypical first-time self-service user flow', () => {
    cy.intercept(
      { method: 'GET', pathname: getEndpoint(REVENUE_PROGRAMS) },
      { fixture: 'org/revenue-programs-1', statusCode: 200 }
    );
    cy.intercept({ method: 'GET', pathname: getEndpoint(LIST_PAGES) }, { body: [], statusCode: 200 }).as('listPages');
    cy.forceLogin(orgAdmin);
    cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: orgAdminWithContentFlag });
    cy.intercept({ method: 'GET', pathname: getEndpoint('/revenue-programs/*/mailchimp-integration/') }, {});
    cy.intercept({ method: 'GET', pathname: getEndpoint(LIST_STYLES + '/') }, { body: [], statusCode: 200 }).as(
      'listStyles'
    );
    cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: stripeVerifiedOrgAdmin });
    cy.intercept({ method: 'GET', pathname: getEndpoint('/revenue-programs/*/mailchimp-integration/') }, {});
    cy.intercept(
      { method: 'POST', pathname: getEndpoint(LIST_PAGES) },
      { fixture: 'pages/create-page-response.json' }
    ).as('createNewPage');
    cy.intercept(
      {
        method: 'GET',
        pathname: getEndpoint(DRAFT_PAGE_DETAIL),
        query: {
          revenue_program: createPageResponse.revenue_program.slug,
          page: createPageResponse.slug
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
    cy.getByTestId('new-page-button').should('exist');
    cy.getByTestId('new-page-button').click();
    cy.wait('@createNewPage');
    cy.wait('@draftPageById');
    cy.getByTestId('publish-button').click();
    cy.getByTestId('page-name-input').type('donate');
    cy.getByTestId('modal-publish-button').click();
    cy.wait('@patchPage');
    cy.getByTestId('page-creation-success-evidence');
    cy.getByTestId('copy-contribution-page-link').click();
  });
});
