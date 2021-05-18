import { STRIPE_CONFIRMATION, STRIPE_ONBOARDING } from 'ajax/endpoints';
import { getEndpoint } from '../support/util';

describe('Payment provider connect', () => {
  it('should not show ProviderConnect if default provider', () => {
    cy.login('user/stripe-verified.json');
    cy.getByTestId('provider-connect').should('not.exist');
    cy.getByTestId('overview').should('exist');
  });

  it('should direct user to ProviderConnect if no default provider', () => {
    cy.intercept('POST', getEndpoint(STRIPE_CONFIRMATION), { fixture: 'stripe/confirm-connected' });
    cy.login('user/not-connected.json');
    cy.getByTestId('provider-connect').should('exist');
  });

  describe('Stripe', () => {
    it('should show "Connected" and "check-circle" if org is verified', () => {
      // After logging in as "not-connected", we'll redirect to stripe confirmation
      // where we mock a successful connection
      cy.intercept('POST', getEndpoint(STRIPE_CONFIRMATION), { fixture: 'stripe/confirm-connected' });
      cy.login('user/not-connected.json');
      cy.contains('Connected').should('exist');
      cy.getByTestId('svg-icon_check-circle').should('exist');
    });

    it('should show a helpful message and "times-circle" if org is restricted', () => {
      cy.intercept('POST', getEndpoint(STRIPE_CONFIRMATION), { fixture: 'stripe/confirm-restricted' });
      cy.login('user/not-connected.json');
      cy.contains('Stripe needs more information before you can accept payments.').should('exist');
      cy.getByTestId('svg-icon_times-circle').should('exist');
    });

    it('should show Stripe connect button and "times-circle" if connection failed', () => {
      cy.intercept('POST', getEndpoint(STRIPE_CONFIRMATION), { fixture: 'stripe/confirm-failed', statusCode: 500 });
      cy.login('user/not-connected.json');
      cy.getByTestId('stripe-connect-button').should('exist');
      cy.getByTestId('svg-icon_times-circle').should('exist');
    });

    it('should show Stripe Connect and no icon if org is not connected', () => {
      cy.intercept('POST', getEndpoint(STRIPE_CONFIRMATION), { fixture: 'stripe/confirm-not-connected' });
      cy.login('user/not-connected.json');
      cy.getByTestId('stripe-connect-button').should('exist');
      cy.getByTestId('svg-icon_check-circle').should('not.exist');
      cy.getByTestId('svg-icon_times-circle').should('not.exist');
    });

    it('should show overlay when stripe onboarding begins', () => {
      cy.intercept('POST', getEndpoint(STRIPE_CONFIRMATION), { fixture: 'stripe/confirm-not-connected' });
      cy.login('user/not-connected.json');
      cy.intercept('POST', getEndpoint(STRIPE_ONBOARDING), { fixture: 'stripe/onboarding' });
      cy.getByTestId('stripe-connect-button').click();
      cy.contains('Complete connection in other tab. This tab can be closed.');
    });
  });
});
