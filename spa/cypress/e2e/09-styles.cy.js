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
    cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: stripeVerifiedOrgAdmin });
    cy.intercept({ method: 'GET', pathname: getEndpoint('/revenue-programs/*/mailchimp_configure/') }, {});
  });

  it('should render send test email section', () => {
    cy.visit(CUSTOMIZE_SLUG);
    cy.url().should('include', CUSTOMIZE_SLUG);
    cy.getByTestId('send-test-email').should('exist');
  });
});
