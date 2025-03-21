import { getEndpoint } from '../support/util';
import {
  TOKEN,
  USER,
  FORGOT_PASSWORD_ENDPOINT,
  LIST_STYLES,
  LIST_PAGES,
  RESET_PASSWORD_ENDPOINT,
  VERIFY_EMAIL_REQUEST_ENDPOINT,
  getStripeAccountLinkStatusPath
} from 'ajax/endpoints';
import {
  SIGN_IN,
  SIGN_UP,
  CONTENT_SLUG,
  DASHBOARD_SLUG,
  FORGOT_PASSWORD,
  RESET_PASSWORD,
  VERIFIED,
  VERIFY_EMAIL_SUCCESS
} from 'routes';
import orgAdminUser from '../fixtures/user/login-success-org-admin.json';
import rpAdminUnverified from '../fixtures/user/login-success-rp-admin-unverified.json';
import selfServiceUserNotStripeVerified from '../fixtures/user/self-service-user-not-stripe-verified.json';
import selfServicUserStripeVerified from '../fixtures/user/self-service-user-stripe-verified.json';
import { CONTENT_SECTION_ACCESS_FLAG_NAME } from 'constants/featureFlagConstants';
import {
  FORGOT_PASSWORD_SUCCESS_TEXT,
  RESET_PASSWORD_SUCCESS_TEXT,
  RESEND_VERIFICATION_SUCCESS_TEXT
} from 'constants/textConstants';

import { CONNECT_STRIPE_COOKIE_NAME } from '../../src/constants/textConstants';

const TOKEN_API_401 = { detail: 'No active account found with the given credentials' };
const TOKEN_API_200 = {
  detail: 'success',
  user: { email: 'test-valid@test.com' },
  csrftoken: 'XZcDLAbuZoerfejgknrekwjgl8ttcHGTcoEpjAHQ70'
};
const FORGOT_PASSWORD_API_200 = { status: 'OK' };
const RESET_PASSWORD_ENDPOINT_200 = { status: 'OK' };
const RESET_PASSWORD_ENDPOINT_404 = { detail: 'Not found. Or anything returned by api' };
const CREATE_USER_ENDPOINT_400 = { email: ['This field must be unique.'] };
const CREATE_USER_ENDPOINT_201 = {
  accepted_terms_of_service: '2022-09-09T12:35:26.757000Z',
  email: 'newuser@fundjournalism.org',
  email_verified: false,
  flags: [],
  organizations: [],
  revenue_programs: [],
  role_type: null
};
const RESEND_VERIFICATION_ENDPOINT_200 = { detail: 'Success' };

const contentSectionFlag = {
  id: '5678',
  name: CONTENT_SECTION_ACCESS_FLAG_NAME
};

const orgAdminWithContentFlag = {
  ...orgAdminUser['user'],
  flags: [contentSectionFlag]
};

const rpAdminUnverifiedNewUser = {
  ...rpAdminUnverified['user'],
  flags: []
};

describe('Account', () => {
  context('Sign In', () => {
    it('should show an error message for invalid credentials', () => {
      cy.visit(SIGN_IN);
      cy.url().should('include', SIGN_IN);
      cy.findByRole('textbox', { name: 'Email' }).type('test@test.com');
      cy.findByLabelText('Password *').type('wrong_password');
      cy.intercept('POST', getEndpoint(TOKEN), {
        statusCode: 401,
        body: TOKEN_API_401
      });
      cy.findByRole('button', { name: 'Sign In' }).click();
      cy.contains(TOKEN_API_401.detail);
    });

    it('should show allow sign-in for valid credentials', () => {
      cy.visit(SIGN_IN);
      cy.url().should('include', SIGN_IN);
      cy.findByRole('textbox', { name: 'Email' }).type('test-valid@test.com');
      cy.findByLabelText('Password *').type('password');
      cy.intercept(getEndpoint(TOKEN), TOKEN_API_200);
      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: orgAdminWithContentFlag });
      cy.findByRole('button', { name: 'Sign In' }).click();
      cy.url().should('include', CONTENT_SLUG);
    });
  });

  context('Forgot Password', () => {
    it('should show a success message on submit of a valid email', () => {
      cy.visit(FORGOT_PASSWORD);
      cy.url().should('include', FORGOT_PASSWORD);
      cy.findByRole('textbox', { name: 'Email' }).type('test@test.com');
      cy.intercept('POST', getEndpoint(FORGOT_PASSWORD_ENDPOINT), {
        statusCode: 200,
        body: FORGOT_PASSWORD_API_200
      });
      cy.findByRole('button', { name: 'Send Reset Link' }).click();
      cy.contains(FORGOT_PASSWORD_SUCCESS_TEXT);
    });
  });

  context('Password Reset', () => {
    it('should show api-response error if password-reset unsuccessful', () => {
      cy.visit(`${RESET_PASSWORD}?token=sometoken`);
      cy.url().should('include', RESET_PASSWORD);
      cy.findByLabelText('New Password *').type('P1#password');
      cy.findByLabelText('Confirm Password *').type('P1#password');
      cy.intercept('POST', getEndpoint(RESET_PASSWORD_ENDPOINT), {
        statusCode: 404,
        body: RESET_PASSWORD_ENDPOINT_404
      });
      cy.findByRole('button', { name: 'Reset Password' }).click();
      cy.contains(RESET_PASSWORD_ENDPOINT_404.detail);
    });

    it('should show a success message if password-reset successful', () => {
      cy.visit(`${RESET_PASSWORD}?token=sometoken`);
      cy.url().should('include', RESET_PASSWORD);
      cy.findByLabelText('New Password *').type('P1#password');
      cy.findByLabelText('Confirm Password *').type('P1#password');
      cy.intercept('POST', getEndpoint(RESET_PASSWORD_ENDPOINT), {
        statusCode: 200,
        body: RESET_PASSWORD_ENDPOINT_200
      });
      cy.findByRole('button', { name: 'Reset Password' }).click();
      cy.contains(RESET_PASSWORD_SUCCESS_TEXT);
    });
  });

  context('Create Account', () => {
    it('should show an error message if email already exists', () => {
      cy.visit(SIGN_UP);
      cy.url().should('include', SIGN_UP);
      cy.findByRole('textbox', { name: 'Email' }).type('test@test.com');
      cy.findByLabelText('Password').type('P1#password');
      cy.findByRole('checkbox').check();
      cy.intercept('POST', getEndpoint(USER), {
        statusCode: 400,
        body: CREATE_USER_ENDPOINT_400
      });
      cy.findByRole('button', { name: 'Create Account' }).click();
      cy.contains('This email is already being used by an account. Try signing in.');
    });

    it('should show create an account and show verify screen', () => {
      cy.visit(SIGN_UP);
      cy.url().should('include', SIGN_UP);
      cy.findByRole('textbox', { name: 'Email' }).type('test@test.com');
      cy.findByLabelText('Password').type('P1#password');
      cy.findByRole('checkbox').check();
      cy.intercept(getEndpoint(TOKEN), TOKEN_API_200);
      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: rpAdminUnverifiedNewUser });
      cy.intercept('POST', getEndpoint(USER), {
        statusCode: 201,
        body: CREATE_USER_ENDPOINT_201
      });
      cy.findByRole('button', { name: 'Create Account' }).click();
      cy.url().should('include', VERIFY_EMAIL_SUCCESS);
    });
  });

  context('Verify Email', () => {
    it('should show `verify-email screen` if user is not verified', () => {
      cy.forceLogin(rpAdminUnverified);
      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: rpAdminUnverifiedNewUser });
      cy.visit(DASHBOARD_SLUG);
      cy.url().should('include', VERIFY_EMAIL_SUCCESS);
    });

    it('should not show `verify-email screen` if user is verified', () => {
      cy.forceLogin(orgAdminUser);
      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: orgAdminWithContentFlag });
      cy.intercept({ method: 'GET', pathname: getEndpoint('/revenue-programs/*/mailchimp_configure/') }, {});
      cy.intercept({ method: 'GET', pathname: getEndpoint(LIST_PAGES) }, { fixture: 'pages/list-pages-1' });
      cy.intercept({ method: 'GET', pathname: getEndpoint(LIST_STYLES) }, { fixture: 'styles/list-styles-1' });
      cy.visit(DASHBOARD_SLUG);
      cy.url().should('include', CONTENT_SLUG);
    });

    it('should send email when user user clicks `Resend Verification` on `verify-email screen`', () => {
      cy.forceLogin(rpAdminUnverified);
      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: rpAdminUnverifiedNewUser });
      cy.intercept('GET', getEndpoint(VERIFY_EMAIL_REQUEST_ENDPOINT), {
        statusCode: 200,
        body: RESEND_VERIFICATION_ENDPOINT_200
      });
      cy.visit(DASHBOARD_SLUG);
      cy.url().should('include', VERIFY_EMAIL_SUCCESS);
      cy.findByRole('button', { name: 'Resend Verification' }).click();
      cy.contains(RESEND_VERIFICATION_SUCCESS_TEXT);
    });

    it('should redirect an unverfied-user from /redirect/{result} to `verify-email screen`', () => {
      cy.forceLogin(rpAdminUnverified);
      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: rpAdminUnverifiedNewUser });
      cy.visit(DASHBOARD_SLUG);
      cy.visit(`${VERIFIED}failed`);
      cy.url().should('include', VERIFY_EMAIL_SUCCESS);
      cy.contains('failed');
    });
  });

  context('Connect Stripe Account flow for self-service users', () => {
    beforeEach(() => {
      cy.intercept({ method: 'GET', pathname: getEndpoint(LIST_PAGES) }, { fixture: 'pages/list-pages-1' });
    });

    it('should stop displaying Account Link CTA when account becomes verified', () => {
      const rp = selfServiceUserNotStripeVerified.revenue_programs[0];
      cy.forceLogin({ ...orgAdminUser, user: selfServiceUserNotStripeVerified });
      /* NB: This intercept (aliased as getUserSecondTime ) and the following one (aliased as
        getUserFirstTime) are in reverse order of how the request/responses actually occur.
        When this view loads, the user will initially be retrieved and return data showing
        no stripe verification. Next, the SPA will make a call to the stripe account link endpoint (on our server)
        which will now show that the account is verifed. When this happens, we invalidate the user query,
        which causes the user to be refetched, along with the now-verified RP.

        While confusing, it is necessary to define the second occuring intercept of the same path first.
        See comment here: https://stackoverflow.com/questions/71485161/cypress-use-same-endpoint-with-different-response-testing-http-race-condition
      */
      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: selfServicUserStripeVerified }).as(
        'getUserSecondTime'
      );
      cy.intercept(
        { method: 'GET', pathname: getEndpoint(USER), times: 1 },
        { body: selfServiceUserNotStripeVerified }
      ).as('getUserFirstTime');

      const stripeAccountLinkResponse = { requiresVerification: false };
      cy.intercept(
        { method: 'POST', pathname: getEndpoint(getStripeAccountLinkStatusPath(rp.id)) },
        { statusCode: 202, body: stripeAccountLinkResponse }
      ).as('stripeAccountLink');

      cy.visit(DASHBOARD_SLUG);
      cy.wait('@getUserFirstTime');
      cy.wait('@stripeAccountLink');
      cy.wait('@getUserSecondTime');
      cy.getByTestId('connect-stripe-modal').should('not.exist');
      cy.getByTestId('connect-stripe-toast').should('not.exist');
    });
  });
});
