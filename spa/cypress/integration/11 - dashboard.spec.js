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

const hubAdminWithAllFlags = {
  ...hubAdminWithoutFlags,
  flags: [{ ...contentSectionFlag }, { ...contribSectionsFlag }]
};

describe('Dashboard', () => {
  beforeEach(() => {
    cy.forceLogin(hubAdminWithoutFlags);
    cy.intercept({ method: 'GET', pathname: getEndpoint(LIST_PAGES) }, { fixture: 'pages/list-pages-1' });
    cy.intercept({ method: 'GET', pathname: getEndpoint(LIST_STYLES) }, { fixture: 'styles/list-styles-1' });
  });
  context('User does NOT have contributions section access flag', () => {
    it('should not show `Contributions` section or sidebar element', () => {
      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: hubAdminWithContentFlag });
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
      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: hubAdminWithAllFlags });
      cy.visit(DONATIONS_SLUG);
      cy.getByTestId('nav-contributions-item').should('exist');
      cy.visit(DONATIONS_SLUG);
      cy.url().should('include', DONATIONS_SLUG);
      cy.getByTestId('donations').should('exist');
    });
  });
  context('User does NOT have content section access flag', () => {
    it('should not show Content section or sidebar element', () => {
      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: hubAdminWithContributionsFlag });
      // we visit this so that can confirm sidebar
      cy.visit(DONATIONS_SLUG);
      cy.getByTestId('nav-list').should('exist');
      cy.getByTestId('nav-pages-item').should('not.exist');
      cy.visit(CONTENT_SLUG);
      cy.url().should('include', CONTENT_SLUG);
      cy.getByTestId('content').should('not.exist');
    });
  });
  context('User DOES have content section access flag', () => {
    it('should show `Content= section and sidebar element', () => {
      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: hubAdminWithAllFlags });
      cy.visit(DONATIONS_SLUG);
      cy.getByTestId('nav-pages-item').should('exist');
      cy.visit(CONTENT_SLUG);
      cy.url().should('include', CONTENT_SLUG);
      // pages-list refers to the content of the Page screen
      cy.getByTestId('pages-list').should('exist');
    });
  });
});
