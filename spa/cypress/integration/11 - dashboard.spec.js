import { getEndpoint } from '../support/util';
import { LIST_STYLES, LIST_PAGES, USER } from 'ajax/endpoints';
import { DASHBOARD_SLUG, DONATIONS_SLUG, CONTENT_SLUG } from 'routes';

import hubAdminWithoutFlags from '../fixtures/user/hub-admin';
import {
  CONTRIBUTIONS_SECTION_ACCESS_FLAG_NAME,
  CONTENT_SECTION_ACCESS_FLAG_NAME
} from 'constants/featureFlagConstants';

const contribSectionsFlag = {
  id: '1234',
  name: CONTRIBUTIONS_SECTION_ACCESS_FLAG_NAME
};

const contentSectionFlag = {
  id: '5678',
  name: CONTENT_SECTION_ACCESS_FLAG_NAME
};

const hubAdminWithContributionsFlag = {
  ...hubAdminWithoutFlags,
  flags: [{ ...contribSectionsFlag }]
};

const hubAdminWithContentFlag = {
  ...hubAdminWithoutFlags,
  flags: [{ ...contentSectionFlag }]
};

describe('Dashboard', () => {
  beforeEach(() => {
    cy.forceLogin(hubAdminWithoutFlags);
    cy.intercept({ method: 'GET', pathname: getEndpoint(LIST_PAGES) }, { fixture: 'pages/list-pages-1' });
    cy.intercept({ method: 'GET', pathname: getEndpoint(LIST_STYLES) }, { fixture: 'styles/list-styles-1' });
  });
  context('User does NOT have contributions section access flag', () => {
    it('should not show `Contributions` section or sidebar element', () => {
      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: hubAdminWithoutFlags });
      cy.visit(DASHBOARD_SLUG);
      // parent nav should exist, but shouldn't have contributions item
      cy.getByTestId('nav-list').should('exist');
      cy.getByTestId('nav-contributions-item').should('not.exist');
      cy.visit(DONATIONS_SLUG);
      cy.url().should('include', DONATIONS_SLUG);
      cy.getByTestId('donations').should('not.exist');
    });
  });
  context('User DOES have contributions section access flag', () => {
    it('should show `Contributions` section and sidebar element', () => {
      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: hubAdminWithContributionsFlag });
      cy.visit(DASHBOARD_SLUG);
      cy.getByTestId('nav-contributions-item').should('exist');
      cy.visit(DONATIONS_SLUG);
      cy.url().should('include', DONATIONS_SLUG);
      cy.getByTestId('donations').should('exist');
    });
  });
  context('User does NOT have content section access flag', () => {
    it('should not show Content section or sidebar element', () => {
      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: hubAdminWithoutFlags });
      cy.visit(DASHBOARD_SLUG);
      cy.getByTestId('nav-list').should('exist');
      cy.getByTestId('nav-content-item').should('not.exist');
      cy.visit(CONTENT_SLUG);
      cy.url().should('include', CONTENT_SLUG);
      cy.getByTestId('content').should('not.exist');
    });
  });
  context('User DOES have content section access flag', () => {
    it('should show `Content= section and sidbar element', () => {
      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: hubAdminWithContentFlag });
      cy.visit(DASHBOARD_SLUG);
      cy.getByTestId('nav-content-item').should('exist');
      cy.visit(CONTENT_SLUG);
      cy.url().should('include', CONTENT_SLUG);
      cy.getByTestId('content').should('exist');
    });
  });
});
