import { getEndpoint } from '../support/util';
import { LIST_STYLES, LIST_PAGES, USER } from 'ajax/endpoints';
import { DASHBOARD_SLUG } from 'routes';

import hubAdminWithoutFlags from '../fixtures/user/hub-admin';
import { CONTRIBUTIONS_SECTION_ACCESS_FLAG_NAME } from 'constants/featureFlagConstants';

const contribSectionsFlag = {
  id: '1234',
  name: CONTRIBUTIONS_SECTION_ACCESS_FLAG_NAME
};

const hubAdminWithFlags = {
  ...hubAdminWithoutFlags,
  flags: [{ ...contribSectionsFlag }]
};

describe('Dashboard', () => {
  beforeEach(() => {
    cy.forceLogin(hubAdminWithFlags);
    cy.intercept({ method: 'GET', pathname: getEndpoint(LIST_PAGES) }, { fixture: 'pages/list-pages-1' });
    cy.intercept({ method: 'GET', pathname: getEndpoint(LIST_STYLES) }, { fixture: 'styles/list-styles-1' });
  });
  context('User does NOT have contributions section access flag', () => {
    it('should only show `Content` section/related nav elements and not `Contributions`', () => {
      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: hubAdminWithoutFlags });
      cy.visit(DASHBOARD_SLUG);
      cy.getByTestId('nav-content-item').should('exist');
      cy.getByTestId('nav-contributions-item').should('not.exist');
    });
  });
  context('User DOES have contributions section access flag', () => {
    it('should show `Content` and `Contributions` sections/related nav elements', () => {
      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: hubAdminWithFlags });
      cy.visit(DASHBOARD_SLUG);
      cy.getByTestId('nav-content-item').should('exist');
      cy.getByTestId('nav-contributions-item').should('exist');
    });
  });
});
