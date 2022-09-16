import { getEndpoint } from '../support/util';
import { LIST_PAGES, LIST_STYLES, USER } from 'ajax/endpoints';
import { CUSTOMIZE_SLUG, SIGN_IN } from 'routes';

import hubAdminUser from '../fixtures/user/hub-admin';
import { CONTENT_SECTION_ACCESS_FLAG_NAME } from 'constants/featureFlagConstants';

const contentSectionFlag = {
  id: '5678',
  name: CONTENT_SECTION_ACCESS_FLAG_NAME
};

const hubAdminWithContentFlag = {
  ...hubAdminUser,
  flags: [{ ...contentSectionFlag }]
};

const InvalidListStyles = [
  {
    id: 1,
    used_live: true,
    errorstyles: {
      colors: {
        primary: 'pink'
      }
    }
  }
];

describe('Generic Error', () => {
  it('should allow user to logout when App Error page is shown', () => {
    cy.forceLogin(hubAdminUser);
    cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: hubAdminWithContentFlag });
    cy.intercept({ method: 'GET', pathname: getEndpoint(LIST_PAGES) }, {});
    cy.intercept({ method: 'GET', pathname: getEndpoint(LIST_STYLES) }, InvalidListStyles).as('listStyles');
    cy.intercept({ method: 'DELETE', pathname: getEndpoint('/token') }, {});
    cy.visit(CUSTOMIZE_SLUG);
    cy.wait('@listStyles');
    cy.getByTestId('error-sign-out').click();
    cy.url().should('include', SIGN_IN);
  });
});

describe('Append trailing slash to the URL', () => {
  it('should append slash to the url with if NOT given', () => {
    cy.visit('sign-in');
    cy.url().should('include', SIGN_IN);
  });
  it('should maintain query params after appending slash', () => {
    cy.visit('sign-in?qs=test');
    cy.url().should('include', SIGN_IN + '?qs=test');
  });
});
