import { getEndpoint } from '../support/util';
import { TOKEN, USER } from 'ajax/endpoints';
import { SIGN_IN, CONTENT_SLUG } from 'routes';
import orgAdminUser from '../fixtures/user/org-admin.json';
import { CONTENT_SECTION_ACCESS_FLAG_NAME } from 'constants/featureFlagConstants';

const TOKEN_API_401 = { detail: 'No active account found with the given credentials' };
const TOKEN_API_200 = {
  detail: 'success',
  user: { email: 'test-valid@test.com' },
  csrftoken: 'XZcDLAbuZoerfejgknrekwjgl8ttcHGTcoEpjAHQ70'
};

const contentSectionFlag = {
  id: '5678',
  name: CONTENT_SECTION_ACCESS_FLAG_NAME
};

const orgAdminWithContentFlag = {
  ...orgAdminUser,
  flags: [{ ...contentSectionFlag }]
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
      cy.getByTestId('signin-submit').click();
      cy.contains('No active account found with the given credentials');
    });

    it('should show allow sign-in for valid credentials', () => {
      cy.visit(SIGN_IN);
      cy.url().should('include', SIGN_IN);
      cy.getByTestId('signin-email').type('test-valid@test.com');
      cy.getByTestId('signin-pwd-password').type('password');
      cy.intercept(getEndpoint(TOKEN), TOKEN_API_200);
      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: orgAdminWithContentFlag });
      cy.getByTestId('signin-submit').click();
      cy.url().should('include', CONTENT_SLUG);
    });
  });
});
