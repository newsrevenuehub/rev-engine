import { getEndpoint } from '../support/util';
import { CUSTOMIZE_SLUG } from 'routes';

import { REVENUE_PROGRAMS, LIST_FONTS, USER, LIST_STYLES } from 'ajax/endpoints';
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
    cy.intercept({ method: 'GET', pathname: getEndpoint('/revenue-programs/*/mailchimp_configure/') }, {});
    cy.intercept({ method: 'GET', pathname: getEndpoint(LIST_FONTS) }, {});
    cy.intercept(
      { method: 'POST', pathname: getEndpoint(LIST_STYLES + '**') },
      { fixture: 'styles/style-create-success' }
    ).as('createStyle');
  });

  it('has prototypical first-time self-service user flow', () => {
    const styleName = 'my style';
    cy.visit(CUSTOMIZE_SLUG);
    cy.url().should('include', CUSTOMIZE_SLUG);
    cy.wait('@listStyles');
    cy.getByTestId('new-style-button').click();
    cy.getByTestId('style-name-input').type(styleName);
    cy.get('#downshift-1-toggle-button').click();
    cy.getByTestId('select-item-0').click();
    cy.getByTestId('save-styles-button').click();
    cy.wait('@createStyle');
    // we take this as evidence that the new style will be displayed on the page.
    // we don't mock the server response to test this here because it doesn't provide
    // any additional confidence beyond what we already know (that a request is made again)
    cy.wait('@listStyles');
  });
});
