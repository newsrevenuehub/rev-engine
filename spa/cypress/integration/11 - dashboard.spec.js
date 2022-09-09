import { getEndpoint } from '../support/util';
import { LIST_STYLES, LIST_PAGES, USER } from 'ajax/endpoints';
import { DASHBOARD_SLUG, DONATIONS_SLUG, CONTENT_SLUG } from 'routes';

import hubAdminWithoutFlags from '../fixtures/user/hub-admin';
import orgAdmin from '../fixtures/user/org-admin.json';

import {
  CONTRIBUTIONS_SECTION_ACCESS_FLAG_NAME,
  CONTRIBUTIONS_SECTION_DENY_FLAG_NAME,
  CONTENT_SECTION_ACCESS_FLAG_NAME
} from 'constants/featureFlagConstants';

const contribSectionsAccessFlag = {
  id: '1234',
  name: CONTRIBUTIONS_SECTION_ACCESS_FLAG_NAME
};

const contribSectionsDenyFlag = {
  id: '1235',
  name: CONTRIBUTIONS_SECTION_DENY_FLAG_NAME
};

const contentSectionFlag = {
  id: '5678',
  name: CONTENT_SECTION_ACCESS_FLAG_NAME
};

const hubAdminWithContributionsAccessFlag = {
  ...hubAdminWithoutFlags,
  flags: [contribSectionsAccessFlag]
};

const hubAdminWithContributionsDenyFlag = {
  ...hubAdminWithoutFlags,
  flags: [contribSectionsDenyFlag, contribSectionsAccessFlag]
};

const hubAdminWithContentFlag = {
  ...hubAdminWithoutFlags,
  flags: [contentSectionFlag]
};

const hubAdminWithAllAccessFlags = {
  ...hubAdminWithoutFlags,
  flags: [contentSectionFlag, contribSectionsAccessFlag]
};

const orgAdminWithContentFlag = {
  ...orgAdmin,
  flags: [contentSectionFlag]
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
      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: hubAdminWithAllAccessFlags });
      cy.visit(DONATIONS_SLUG);
      cy.getByTestId('nav-contributions-item').should('exist');
      cy.visit(DONATIONS_SLUG);
      cy.url().should('include', DONATIONS_SLUG);
      cy.getByTestId('donations').should('exist');
    });
  });
  context('User does NOT have content section access flag', () => {
    it('should not show Content section or sidebar element', () => {
      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: hubAdminWithContributionsAccessFlag });
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
    it('should show `Content= section and sidbar element', () => {
      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: hubAdminWithAllAccessFlags });
      cy.visit(DONATIONS_SLUG);
      cy.getByTestId('nav-pages-item').should('exist');
      cy.visit(CONTENT_SLUG);
      cy.url().should('include', CONTENT_SLUG);
      // pages-list refers to the content of the Page screen
      cy.getByTestId('pages-list').should('exist');
    });
  });
  context('User DOES have contributions section deny flag', () => {
    it('should not show `Contributions` section or sidebar element if denied', () => {
      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: hubAdminWithContributionsDenyFlag });
      cy.visit(DASHBOARD_SLUG);
      // parent nav should exist, but shouldn't have contributions item
      cy.getByTestId('nav-list').should('exist');
      cy.getByTestId('nav-contributions-item').should('not.exist');
      cy.visit(DONATIONS_SLUG);
      cy.url().should('include', DONATIONS_SLUG);
      cy.getByTestId('donations').should('not.exist');
    });
  });

  describe('Footer', () => {
    for (const { body, label } of [
      { label: 'Hub admins', body: hubAdminWithContentFlag },
      { label: 'org admins', body: orgAdminWithContentFlag }
    ]) {
      it(`shows a help link to ${label}`, () => {
        cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body });
        cy.visit(DASHBOARD_SLUG);
        cy.getByTestId('nav-help-item')
          .should('exist')
          .should('have.text', 'Help')
          .should('have.attr', 'href', 'https://fundjournalism.org/news-revenue-engine-help/')
          .should('have.attr', 'target', '_blank');
      });

      it(`shows a FAQ link to ${label}`, () => {
        cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body });
        cy.visit(DASHBOARD_SLUG);
        cy.getByTestId('nav-faq-item')
          .should('exist')
          .should('have.text', 'FAQ')
          .should(
            'have.attr',
            'href',
            'https://news-revenue-hub.atlassian.net/servicedesk/customer/portal/11/article/2195423496'
          )
          .should('have.attr', 'target', '_blank');
      });
    }
  });
});
