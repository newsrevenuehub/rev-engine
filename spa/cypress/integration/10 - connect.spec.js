import { STRIPE_CONFIRMATION, STRIPE_OAUTH, LIST_PAGES } from 'ajax/endpoints';
import { getEndpoint } from '../support/util';
// Constants
import { STRIPE_CLIENT_ID, STRIPE_OAUTH_SCOPE } from 'settings';

import { CONTENT_SLUG } from 'routes';
import orgAdminUser from '../fixtures/user/org-admin';

const redirectPath = '/dashboard/content';
describe('Payment provider connect', () => {
  it('should not show ProviderConnect if default provider', () => {
    cy.forceLogin(orgAdminUser);
    cy.intercept(
      { method: 'GET', pathname: getEndpoint(LIST_PAGES) },
      { fixture: 'pages/list-pages-1', statusCode: 200 }
    );
    cy.visit(CONTENT_SLUG);
    cy.getByTestId('provider-connect').should('not.exist');
    cy.getByTestId('content').should('exist');
  });

  it('should direct user to ProviderConnect if no default provider', () => {
    const user = {
      ...orgAdminUser,
      user: {
        ...orgAdminUser.user,
        organizations: [
          {
            ...orgAdminUser.user.organizations[0],
            stripe_account_id: '',
            stripe_verified: false
          }
        ]
      }
    };
    cy.intercept('POST', getEndpoint(STRIPE_CONFIRMATION), { fixture: 'stripe/confirm-connected' });
    cy.forceLogin(user);
    cy.visit(CONTENT_SLUG);
    cy.getByTestId('provider-connect').should('exist');
  });

  describe('Stripe', () => {
    it('should show a helpful message and "times-circle" if org is restricted', () => {
      cy.intercept('POST', getEndpoint(STRIPE_CONFIRMATION), { fixture: 'stripe/confirm-restricted' });
      const user = {
        ...orgAdminUser,
        user: {
          ...orgAdminUser.user,
          organizations: [
            {
              ...orgAdminUser.user.organizations[0],
              stripe_account_id: '',
              stripe_verified: false
            }
          ]
        }
      };
      cy.forceLogin(user);
      cy.visit(CONTENT_SLUG);
      cy.contains('Stripe needs more information before you can accept contributions.').should('exist');
      cy.getByTestId('svg-icon_times-circle').should('exist');
    });

    it('should show Stripe connect button and "times-circle" if connection failed', () => {
      cy.intercept('POST', getEndpoint(STRIPE_CONFIRMATION), { fixture: 'stripe/confirm-failed', statusCode: 500 });
      const user = {
        ...orgAdminUser,
        user: {
          ...orgAdminUser.user,
          organizations: [
            {
              ...orgAdminUser.user.organizations[0],
              stripe_account_id: '',
              stripe_verified: false
            }
          ]
        }
      };
      cy.forceLogin(user);
      cy.visit(CONTENT_SLUG);
      cy.getByTestId('stripe-connect-link').should('exist');
      cy.getByTestId('svg-icon_times-circle').should('exist');
    });

    it('should show Stripe Connect and no icon if org is not connected', () => {
      cy.intercept('POST', getEndpoint(STRIPE_CONFIRMATION), { fixture: 'stripe/confirm-not-connected' });
      const user = {
        ...orgAdminUser,
        user: {
          ...orgAdminUser.user,
          organizations: [
            {
              ...orgAdminUser.user.organizations[0],
              stripe_account_id: '',
              stripe_verified: false
            }
          ]
        }
      };
      cy.forceLogin(user);
      cy.visit(CONTENT_SLUG);
      cy.getByTestId('stripe-connect-link').should('exist');
      cy.getByTestId('svg-icon_check-circle').should('not.exist');
      cy.getByTestId('svg-icon_times-circle').should('not.exist');
    });

    it('should render a connect button with the expected href', () => {
      const expectedRedirectUri = `${window.location.protocol}//${window.location.host}${redirectPath}`;
      const expectedHref = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${STRIPE_CLIENT_ID}&scope=${STRIPE_OAUTH_SCOPE}&redirect_uri=${expectedRedirectUri}`;
      cy.getByTestId('stripe-connect-link').should('have.attr', 'href', expectedHref);
    });

    it('should send a request to oauth verification if params present', () => {
      const code = '1234';
      const scope = 'read_write';
      cy.intercept('POST', getEndpoint(STRIPE_CONFIRMATION), { fixture: 'stripe/confirm-not-connected' });
      cy.intercept('POST', getEndpoint(STRIPE_OAUTH)).as('oauthConfirm');
      const user = {
        ...orgAdminUser,
        user: {
          ...orgAdminUser.user,
          organizations: [
            {
              ...orgAdminUser.user.organizations[0],
              stripe_account_id: '',
              stripe_verified: false
            }
          ]
        }
      };
      cy.forceLogin(user);
      cy.visit(redirectPath + `?code=${code}&scope=${scope}`);
      cy.wait('@oauthConfirm').then((interception) => {
        expect(interception.request.body).to.have.property('code', code);
        expect(interception.request.body).to.have.property('scope', scope);
      });
    });
  });
});
