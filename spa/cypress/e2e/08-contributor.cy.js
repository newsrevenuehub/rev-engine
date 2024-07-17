import { GET_MAGIC_LINK, SUBSCRIPTIONS, VERIFY_TOKEN, CONTRIBUTIONS } from 'ajax/endpoints';
import { getEndpoint } from '../support/util';
import { CONTRIBUTOR_ENTRY, CONTRIBUTOR_VERIFY } from 'routes';
import donationsData from '../fixtures/donations/18-results.json';
import { GENERIC_ERROR_WITH_SUPPORT_INFO } from 'constants/textConstants';
import { CONTRIBUTION_INTERVALS } from '../../src/constants/contributionIntervals';

// Util
import isEqual from 'lodash.isequal';

function validExpirationDate() {
  const today = new Date();

  return `${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getFullYear() % 100}`;
}

describe('New Portal', () => {
  before(() => {
    cy.visit(CONTRIBUTOR_ENTRY);
  });

  describe('Contributor magic link request', () => {
    it('should send request with provided email', () => {
      const email = 'test@testing.com';
      cy.intercept('POST', getEndpoint(GET_MAGIC_LINK)).as('getMagicLink');
      cy.findByRole('textbox', { name: 'Email Address' }).type(email);
      cy.findByRole('button', { name: 'Send Magic Link' }).click();
      return cy.wait('@getMagicLink').then((intercept) => {
        expect(intercept.request.body.email).equal(email);
      });
    });

    it.skip('should display "too many attempts" error on email if 429 status', () => {
      const emailError = ['email error'];
      cy.visit(CONTRIBUTOR_ENTRY);
      cy.intercept(
        { method: 'POST', url: getEndpoint(GET_MAGIC_LINK) },
        { body: { email: emailError }, statusCode: 429 }
      ).as('getMagicLink');
      cy.getByTestId('magic-link-email-button').click();
      cy.contains('Too many attempts. Try again in one minute.');
    });

    it.skip('should display generic alert error message on email if non-200 status', () => {
      cy.visit(CONTRIBUTOR_ENTRY);
      cy.intercept({ method: 'POST', url: getEndpoint(GET_MAGIC_LINK) }, { statusCode: 500 }).as('getMagicLink');
      cy.getByTestId('magic-link-email-button').click();
      cy.getByTestId('alert').contains(GENERIC_ERROR_WITH_SUPPORT_INFO);
    });

    it.skip('should display generic success message if status 200', () => {
      cy.intercept({ method: 'POST', url: getEndpoint(GET_MAGIC_LINK) }, { statusCode: 200 }).as('getMagicLink');
      cy.getByTestId('magic-link-email-button').click();
      cy.contains('An email has been sent to you containing your magic link');
    });
  });

  describe.skip('Contributor dashboard', () => {
    beforeEach(() => {
      // "Log in" to contributor dash
      cy.intercept({ method: 'POST', url: getEndpoint(VERIFY_TOKEN) }, { fixture: 'user/valid-contributor-1.json' }).as(
        'login'
      );
      cy.interceptPaginatedDonations();
      cy.visit(CONTRIBUTOR_VERIFY);
      cy.wait(['@login', '@getDonations']);
    });

    it('should display a list of contributions', () => {
      cy.getByTestId('donations-table');
      // DonationsTable is well tested elsewhere...
      cy.get('tbody tr').should('have.length', 10);
      cy.get('li > button[aria-label="page 1"]').should('exist');
      cy.get('li > button[aria-label="Go to page 2"]').should('exist');
      // ... though here we should see different column headers
      const expectedColumns = [
        'Date',
        'Amount',
        'Frequency',
        'Receipt date',
        'Payment method',
        'Payment status',
        'Cancel'
      ];
      cy.getByTestId('donation-header', {}, true).should('have.length', expectedColumns.length);
      cy.getByTestId('donation-header', {}, true).should(($headers) => {
        const headersSet = new Set($headers.toArray().map((header) => header.innerText));
        const expectedSet = new Set(expectedColumns);
        expect(headersSet.size).to.be.greaterThan(0);
        expect(isEqual(headersSet, expectedSet)).to.be.true;
        expectedSet.forEach((header, i) => header === headersSet[i]);
      });
    });

    it('should show icons for payment methods and last4 digits of card', () => {
      // VISA
      const visaContribution = donationsData.find((d) => d.card_brand === 'visa');
      const visaId = visaContribution?.id;
      const visaNum = visaContribution?.last4;
      cy.get(`[data-donationid="${visaId}"`).within(() => {
        cy.getByTestId('card-icon-visa');
      });
      cy.get(`[data-donationid="${visaId}"`).contains(visaNum);

      // MASTERCARD
      const mcContribution = donationsData.find((d) => d.card_brand === 'mastercard');
      const mcId = mcContribution?.id;
      const mcNum = mcContribution?.last4;
      cy.get(`[data-donationid="${mcId}"`).within(() => {
        cy.getByTestId('card-icon-mastercard');
      });
      cy.get(`[data-donationid="${mcId}"`).contains(mcNum);

      // DISCOVER
      const discoverContribution = donationsData.find((d) => d.card_brand === 'discover');
      const discoverId = discoverContribution?.id;
      const discoverNum = discoverContribution?.last4;
      cy.get(`[data-donationid="${discoverId}"`).within(() => {
        cy.getByTestId('card-icon-discover');
      });
      cy.get(`[data-donationid="${discoverId}"`).contains(discoverNum);

      // AMEX
      const amexContribution = donationsData.find((d) => d.card_brand === 'amex');
      const amexId = amexContribution?.id;
      const amexNum = amexContribution?.last4;
      cy.get(`[data-donationid="${amexId}"`).within(() => {
        cy.getByTestId('card-icon-amex');
      });
      cy.get(`[data-donationid="${amexId}"`).contains(amexNum);
    });

    it('should only show cancel button for recurring payments', () => {
      const oneTimeCont = donationsData.find((d) => d.interval === CONTRIBUTION_INTERVALS.ONE_TIME);
      const oneTimeId = oneTimeCont.id;
      cy.get(`[data-donationid="${oneTimeId}"]`).within(() => {
        cy.getByTestId('cancel-recurring-button').should('not.exist');
      });
      const recurringCont = donationsData.find((d) => d.interval !== CONTRIBUTION_INTERVALS.ONE_TIME);
      const recurringId = recurringCont.id;
      cy.get(`[data-donationid="${recurringId}"]`).within(() => {
        cy.getByTestId('cancel-recurring-button').should('exist');
      });
    });

    it('should show update payment method modal when payment method clicked for recurring contribution', () => {
      cy.get('td[data-testcolumnaccessor="interval"]')
        .contains('Monthly')
        .closest('tr')
        .find('[data-testid="payment-method"]')
        .first()
        .click();
      cy.getByTestId('edit-recurring-payment-modal').should('exist');
      cy.getByTestId('close-modal').click();
    });

    it('should do send cancel request if continue is clicked', () => {
      const targetContribution = donationsData.find((d) => d.interval !== 'one_time');

      cy.get(`[data-donationid="${targetContribution.id}"]`).within(() => {
        cy.getByTestId('cancel-recurring-button').click();
      });
      cy.intercept('DELETE', getEndpoint(`${SUBSCRIPTIONS}${targetContribution.subscription_id}`), {
        statusCode: 200
      }).as('cancelRecurring');
      cy.getByTestId('confirm-cancel-button').click();
      cy.wait('@cancelRecurring');
    });
  });

  describe.skip('Empty contributor dashboard', () => {
    beforeEach(() => {
      // "Log in" to contributor dash
      cy.intercept({ method: 'POST', url: getEndpoint(VERIFY_TOKEN) }, { fixture: 'user/valid-contributor-1.json' }).as(
        'login'
      );
      cy.intercept({ pathname: getEndpoint(CONTRIBUTIONS) }, { body: [] }).as('getEmptyDonations');
      cy.visit(CONTRIBUTOR_VERIFY);
      cy.wait(['@login', '@getEmptyDonations']);
    });
    it('should display empty list of contributions', () => {
      cy.contains('0 contributions to show.');
    });
  });
});

describe.skip('Update recurring contribution modal', () => {
  beforeEach(() => {
    // "Log in" to contributor dash
    cy.intercept({ method: 'POST', url: getEndpoint(VERIFY_TOKEN) }, { fixture: 'user/valid-contributor-1.json' }).as(
      'login'
    );
    cy.interceptPaginatedDonations();
    cy.visit(CONTRIBUTOR_VERIFY);
    cy.wait(['@login', '@getDonations']);
    cy.get('td[data-testcolumnaccessor="interval"]')
      .contains('Monthly')
      .closest('tr')
      .find('[data-testid="payment-method"]')
      .first()
      .click();
  });

  it(
    'should not enable update payment method when card number is not fully entered',
    { defaultCommandTimeout: 10000 },
    () => {
      cy.setStripeCardElement('cardExpiry', '0199');
      cy.setStripeCardElement('cardCvc', '123');
      cy.getByTestId('contrib-update-payment-method-btn').should('be.disabled');
      cy.setStripeCardElement('cardNumber', '4242');
      cy.getByTestId('contrib-update-payment-method-btn').should('be.disabled');
    }
  );

  it('should not enable update payment method when card number is invalid', { defaultCommandTimeout: 15000 }, () => {
    cy.setStripeCardElement('cardNumber', '1234123412341234');
    cy.setStripeCardElement('cardExpiry', '0199');
    cy.setStripeCardElement('cardCvc', '123');
    cy.getByTestId('contrib-update-payment-method-btn').should('be.disabled');
  });

  it(
    'should not enable update payment method when card expiry is not fully entered',
    { defaultCommandTimeout: 10000 },
    () => {
      cy.setStripeCardElement('cardNumber', '4242424242424242');
      cy.setStripeCardElement('cardExpiry', '0199');
      cy.setStripeCardElement('cardCvc', '123');
      cy.setStripeCardElement('postalCode', '12345');
      cy.getByTestId('contrib-update-payment-method-btn').should('be.disabled');
    }
  );

  it('should not enable update payment method when card expiry is invalid', { defaultCommandTimeout: 15000 }, () => {
    cy.setStripeCardElement('cardNumber', '4242424242424242');
    cy.setStripeCardElement('cardCvc', '123');
    cy.setStripeCardElement('postalCode', '12345');
    cy.getByTestId('contrib-update-payment-method-btn').should('be.disabled');
  });

  it(
    'should not enable update payment method when card cvc is not fully entered',
    { defaultCommandTimeout: 10000 },
    () => {
      cy.setStripeCardElement('cardNumber', '4242424242424242');
      cy.setStripeCardElement('cardExpiry', '0199');
      cy.setStripeCardElement('postalCode', '12345');
      cy.getByTestId('contrib-update-payment-method-btn').should('be.disabled');
      cy.setStripeCardElement('cardCvc', '12');
      cy.getByTestId('contrib-update-payment-method-btn').should('be.disabled');
    }
  );

  it(
    'should not enable update payment method when postal code is not fully entered',
    { defaultCommandTimeout: 10000 },
    () => {
      cy.setStripeCardElement('cardNumber', '4242424242424242');
      cy.setStripeCardElement('cardExpiry', '0199');
      cy.setStripeCardElement('cardCvc', '123');
      cy.getByTestId('contrib-update-payment-method-btn').should('be.disabled');
      cy.setStripeCardElement('postalCode', '1234');
      cy.getByTestId('contrib-update-payment-method-btn').should('be.disabled');
    }
  );

  it(
    'should enable update payment method when card details are entered correctly',
    { defaultCommandTimeout: 10000 },
    () => {
      cy.setStripeCardElement('cardNumber', '4242424242424242');
      cy.setStripeCardElement('cardExpiry', validExpirationDate());
      cy.setStripeCardElement('cardCvc', '123');
      cy.setStripeCardElement('postalCode', '12345');
      cy.getByTestId('contrib-update-payment-method-btn').should('not.be.disabled');
    }
  );

  describe('when the form is submitted', () => {
    // Find matching data for the payment we edit in the parent beforeEach().
    const contribution = donationsData.find((donation) => donation.interval === 'month');

    beforeEach(() => {
      // This intercepts a call made by Stripe.js.
      cy.intercept(
        { method: 'POST', url: 'https://api.stripe.com/v1/payment_methods' },
        { body: { id: 'mock-payment-id' } }
      ).as('postStripePaymentMethod');
      cy.intercept(
        { method: 'PATCH', url: getEndpoint(`${SUBSCRIPTIONS}${contribution.subscription_id}/`) },
        { statusCode: 200 }
      ).as('patchSubscription');

      cy.setStripeCardElement('cardNumber', '4242424242424242');
      cy.setStripeCardElement('cardExpiry', validExpirationDate());
      cy.setStripeCardElement('cardCvc', '123');
      cy.setStripeCardElement('postalCode', '12345');
    });

    it('creates a Stripe payment method and sends a PATCH to update the contribution', () => {
      cy.getByTestId('contrib-update-payment-method-btn').click();
      cy.wait(['@postStripePaymentMethod', '@patchSubscription']).then(([_, patchSubscription]) => {
        // Don't test that Stripe.js sends the right API request--only that the
        // PATCH uses the payment method ID returned.
        expect(patchSubscription.request.body).eql({
          payment_method_id: 'mock-payment-id',
          revenue_program_slug: contribution.revenue_program
        });
      });
    });

    it('shows a confirmation message to the user', () => {
      cy.getByTestId('contrib-update-payment-method-btn').click();
      cy.wait(['@postStripePaymentMethod', '@patchSubscription']).then(() =>
        cy.getByTestId('edit-recurring-payment-modal-success').should('exist')
      );
    });
  });
});
