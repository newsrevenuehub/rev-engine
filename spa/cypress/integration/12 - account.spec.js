import { getEndpoint } from '../support/util';
import {
  TOKEN,
  USER,
  FORGOT_PASSWORD_ENDPOINT,
  LIST_STYLES,
  LIST_PAGES,
  RESET_PASSWORD_ENDPOINT,
  VERIFY_EMAIL_REQUEST_ENDPOINT
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
import orgAdminUser from '../fixtures/user/org-admin.json';
import rpAdminUnverified from '../fixtures/user/rp-admin-unverified.json';
import { CONTENT_SECTION_ACCESS_FLAG_NAME } from 'constants/featureFlagConstants';
import {
  FORGOT_PASSWORD_SUCCESS_TEXT,
  RESET_PASSWORD_SUCCESS_TEXT,
  RESEND_VERIFICATION_SUCCESS_TEXT
} from 'constants/textConstants';

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
      cy.getByTestId('signin-email').type('test@test.com');
      cy.getByTestId('signin-pwd-password').type('wrong_password');
      cy.intercept('POST', getEndpoint(TOKEN), {
        statusCode: 401,
        body: TOKEN_API_401
      });
      cy.get('button[name="Sign In"]').click();
      cy.contains(TOKEN_API_401.detail);
    });

    it('should show allow sign-in for valid credentials', () => {
      cy.visit(SIGN_IN);
      cy.url().should('include', SIGN_IN);
      cy.getByTestId('signin-email').type('test-valid@test.com');
      cy.getByTestId('signin-pwd-password').type('password');
      cy.intercept(getEndpoint(TOKEN), TOKEN_API_200);
      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: orgAdminWithContentFlag });
      cy.get('button[name="Sign In"]').click();
      cy.url().should('include', CONTENT_SLUG);
    });
  });

  context('Forgot Password', () => {
    it('should show a success message on submit of a valid email', () => {
      cy.visit(FORGOT_PASSWORD);
      cy.url().should('include', FORGOT_PASSWORD);
      cy.getByTestId('forgotpwd-email').type('test@test.com');
      cy.intercept('POST', getEndpoint(FORGOT_PASSWORD_ENDPOINT), {
        statusCode: 200,
        body: FORGOT_PASSWORD_API_200
      });
      cy.get('button[name="Send Reset Link"]').click();
      cy.contains(FORGOT_PASSWORD_SUCCESS_TEXT);
    });
  });

  context('Password Reset', () => {
    it('should show api-response error if password-reset unsuccessfull', () => {
      cy.visit(`${RESET_PASSWORD}?token=sometoken`);
      cy.url().should('include', RESET_PASSWORD);
      cy.getByTestId('reset-pwd-password').type('P1#password');
      cy.getByTestId('reset-pwd1-password').type('P1#password');
      cy.intercept('POST', getEndpoint(RESET_PASSWORD_ENDPOINT), {
        statusCode: 404,
        body: RESET_PASSWORD_ENDPOINT_404
      });
      cy.get('button[name="Reset Password"]').click();
      cy.contains(RESET_PASSWORD_ENDPOINT_404.detail);
    });

    it('should show a success message if password-reset successfull', () => {
      cy.visit(`${RESET_PASSWORD}?token=sometoken`);
      cy.url().should('include', RESET_PASSWORD);
      cy.getByTestId('reset-pwd-password').type('P1#password');
      cy.getByTestId('reset-pwd1-password').type('P1#password');
      cy.intercept('POST', getEndpoint(RESET_PASSWORD_ENDPOINT), {
        statusCode: 200,
        body: RESET_PASSWORD_ENDPOINT_200
      });
      cy.get('button[name="Reset Password"]').click();
      cy.contains(RESET_PASSWORD_SUCCESS_TEXT);
    });
  });

  context('Create Account', () => {
    it('should show an error message if email already exists', () => {
      cy.visit(SIGN_UP);
      cy.url().should('include', SIGN_UP);
      cy.get('input[name="email"]').type('test@test.com');
      cy.get('input[name="password"]').type('P1#password');
      cy.get('[type="checkbox"]').check();
      cy.intercept('POST', getEndpoint(USER), {
        statusCode: 400,
        body: CREATE_USER_ENDPOINT_400
      });
      cy.get('button[name="Create Account"]').click();
      cy.contains(`Email:${CREATE_USER_ENDPOINT_400.email}`);
    });

    it('should show create an account and show verify screen', () => {
      cy.visit(SIGN_UP);
      cy.url().should('include', SIGN_UP);
      cy.get('input[name="email"]').type('test@test.com');
      cy.get('input[name="password"]').type('P1#password');
      cy.get('[type="checkbox"]').check();
      cy.intercept(getEndpoint(TOKEN), TOKEN_API_200);
      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: rpAdminUnverifiedNewUser });
      cy.intercept('POST', getEndpoint(USER), {
        statusCode: 201,
        body: CREATE_USER_ENDPOINT_201
      });
      cy.get('button[name="Create Account"]').click();
      cy.url().should('include', VERIFY_EMAIL_SUCCESS);
    });
  });

  context('Verify Email', () => {
    it('it should show `verify-email screen` if user is not verified', () => {
      cy.forceLogin(rpAdminUnverified);
      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: rpAdminUnverifiedNewUser });
      cy.visit(DASHBOARD_SLUG);
      cy.url().should('include', VERIFY_EMAIL_SUCCESS);
    });

    it('it should not show `verify-email screen` if user is verified', () => {
      cy.forceLogin(orgAdminUser);
      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: orgAdminWithContentFlag });
      cy.intercept({ method: 'GET', pathname: getEndpoint(LIST_PAGES) }, { fixture: 'pages/list-pages-1' });
      cy.intercept({ method: 'GET', pathname: getEndpoint(LIST_STYLES) }, { fixture: 'styles/list-styles-1' });
      cy.visit(DASHBOARD_SLUG);
      cy.url().should('include', CONTENT_SLUG);
    });

    it('it should send email when user user clicks `Resend Verification` on `verify-email screen`', () => {
      cy.forceLogin(rpAdminUnverified);
      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: rpAdminUnverifiedNewUser });
      cy.intercept('GET', getEndpoint(VERIFY_EMAIL_REQUEST_ENDPOINT), {
        statusCode: 200,
        body: RESEND_VERIFICATION_ENDPOINT_200
      });
      cy.visit(DASHBOARD_SLUG);
      cy.url().should('include', VERIFY_EMAIL_SUCCESS);
      cy.get('button[name="Resend Verification"]').click();
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
});
