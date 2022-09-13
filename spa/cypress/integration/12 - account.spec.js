import { getEndpoint } from '../support/util';
import { TOKEN, USER, FORGOT_PASSWORD_ENDPOINT, RESET_PASSWORD_ENDPOINT } from 'ajax/endpoints';
import { SIGN_IN, CONTENT_SLUG, FORGOT_PASSWORD, RESET_PASSWORD } from 'routes';
import orgAdminUser from '../fixtures/user/org-admin.json';
import { CONTENT_SECTION_ACCESS_FLAG_NAME } from 'constants/featureFlagConstants';
import { FORGOT_PASSWORD_SUCCESS_TEXT, RESET_PASSWORD_SUCCESS_TEXT } from 'constants/textConstants';

const TOKEN_API_401 = { detail: 'No active account found with the given credentials' };
const TOKEN_API_200 = {
  detail: 'success',
  user: { email: 'test-valid@test.com' },
  csrftoken: 'XZcDLAbuZoerfejgknrekwjgl8ttcHGTcoEpjAHQ70'
};
const FORGOT_PASSWORD_API_200 = { status: 'OK' };
const RESET_PASSWORD_ENDPOINT_200 = { status: 'OK' };
const RESET_PASSWORD_ENDPOINT_404 = { detail: 'Not found. Or anything returned by api' };

const contentSectionFlag = {
  id: '5678',
  name: CONTENT_SECTION_ACCESS_FLAG_NAME
};

const orgAdminWithContentFlag = {
  ...orgAdminUser,
  flags: [contentSectionFlag]
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
});
