import { getEndpoint } from '../support/util';
import { CUSTOMIZE_SLUG } from 'routes';

import { REVENUE_PROGRAMS, LIST_FONTS, USER, PATCH_PAGE, LIST_STYLES } from 'ajax/endpoints';
import orgAdmin from '../fixtures/user/login-success-org-admin.json';
import stripeVerifiedOrgAdmin from '../fixtures/user/self-service-user-stripe-verified.json';

describe('Styles view', () => {
  beforeEach(() => {
    cy.forceLogin(orgAdmin);
    cy.intercept(
      { method: 'GET', pathname: getEndpoint(REVENUE_PROGRAMS) },
      { fixture: 'org/revenue-programs-1', statusCode: 200 }
    );
    cy.intercept({ method: 'GET', pathname: getEndpoint(LIST_STYLES + '/') }, { body: [], statusCode: 200 }).as(
      'listStyles'
    );
    cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: stripeVerifiedOrgAdmin });
    cy.intercept({ method: 'GET', pathname: getEndpoint(LIST_FONTS) }, {});
    cy.intercept(
      { method: 'POST', pathname: getEndpoint(LIST_STYLES + '**') },
      { fixture: 'styles/style-create-success' }
    ).as('createStyle');
  });

  it('has prototypical first-time self-service user flow', () => {
    cy.visit(CUSTOMIZE_SLUG);
    cy.url().should('include', CUSTOMIZE_SLUG);
    cy.wait('@listStyles');
    cy.getByTestId('new-style-button').click();
    cy.getByTestId('style-name-input').type('my style');
    cy.get('#downshift-1-toggle-button').click();
    cy.getByTestId('select-item-0').click();
    cy.getByTestId('save-styles-button').click();
    cy.wait('@createStyle');
  });
});
