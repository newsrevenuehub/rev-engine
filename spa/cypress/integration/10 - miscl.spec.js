import { getEndpoint } from '../support/util';
import { LIST_PAGES, LIST_FONTS, LIST_STYLES, USER } from 'ajax/endpoints';
import { CUSTOMIZE_SLUG, LOGIN } from 'routes';
import stylesList from '../fixtures/styles/list-styles-1.json';

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

const [styleA] = stylesList;

describe('Generic Error', () => {
  it('should allow user to logout when App Error page is shown', () => {
    cy.forceLogin(hubAdminUser);
    cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: hubAdminWithContentFlag });
    cy.intercept({ method: 'GET', pathname: getEndpoint(LIST_PAGES) }, {});
    cy.intercept({ method: 'GET', pathname: getEndpoint(LIST_STYLES) }, InvalidListStyles).as('listStyles');
    cy.intercept({ method: 'DELETE', pathname: getEndpoint('/token') }, {});
    cy.visit(CUSTOMIZE_SLUG);
    cy.wait('@listStyles');
    cy.getByTestId('error-sign-out').click({ force: true });
    cy.url().should('include', LOGIN);
  });
});
