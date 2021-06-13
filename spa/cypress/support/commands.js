import { TOKEN } from 'ajax/endpoints';
import { getEndpoint } from './util';
import { LIVE_PAGE, STRIPE_PAYMENT } from 'ajax/endpoints';

Cypress.Commands.add('getByTestId', (testId, options) => {
  return cy.get(`[data-testid="${testId}"]`, options);
});

Cypress.Commands.add('login', (userFixture) => {
  cy.clearLocalStorage();
  cy.visit('/');
  cy.getByTestId('login-email').type('test@user.com');
  cy.getByTestId('login-password').type('testing');
  cy.intercept('POST', getEndpoint(TOKEN), { fixture: userFixture });
  cy.getByTestId('login-button').click();
});

Cypress.Commands.add('visitDonationPage', () => {
  cy.intercept(
    { method: 'GET', pathname: getEndpoint(LIVE_PAGE) },
    { fixture: 'pages/live-page-1', statusCode: 200 }
  ).as('getPageDetail');
  cy.visit('/revenue-program-slug/page-slug');
  cy.wait('@getPageDetail');
});

Cypress.Commands.add('iframeLoaded', { prevSubject: 'element' }, (iframe) => {
  const contentWindow = iframe.prop('contentWindow');
  return new Promise((resolve) => {
    if (contentWindow && contentWindow.document.readyState === 'complete') {
      resolve(contentWindow);
    } else {
      iframe.on('load', () => {
        resolve(contentWindow);
      });
    }
  });
});

Cypress.Commands.add('getInDocument', { prevSubject: 'document' }, (document, selector) =>
  Cypress.$(selector, document)
);

Cypress.Commands.add('getWithinIframe', (targetElement) =>
  cy.get('iframe').iframeLoaded().its('document').getInDocument(targetElement)
);

Cypress.Commands.add('interceptDonation', () => {
  cy.intercept(
    { method: 'POST', pathname: getEndpoint(STRIPE_PAYMENT) },
    { fixture: 'stripe/payment-intent', statusCode: 200 }
  ).as('stripePayment');

  cy.intercept('/v1/payment_intents/**', { statusCode: 200 }).as('confirmCardPayment');

  cy.intercept('/v1/payment_methods/**', { fixture: 'stripe/payment-method', statusCode: 200 }).as(
    'createPaymentMethod'
  );
});

Cypress.Commands.add('setUpDonation', (frequency, amount) => {
  cy.getByTestId(`frequency-${frequency}`).click();
  cy.getByTestId(`amount-${amount}`).click();
});

Cypress.Commands.add('makeDonation', () => {
  cy.getWithinIframe('[name="cardnumber"]').type('4242424242424242');
  cy.getWithinIframe('[name="exp-date"]').type('1232');
  cy.getWithinIframe('[name="cvc"]').type('123');
  cy.getWithinIframe('[name="postal"]').type('12345');
  cy.getByTestId('donation-submit').click();
});
