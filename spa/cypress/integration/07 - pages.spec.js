import { getEndpoint } from '../support/util';
import { LIST_PAGES, LIST_STYLES, USER } from 'ajax/endpoints';
import pagesList from '../fixtures/pages/list-pages-1.json';
import { CONTENT_SLUG } from 'routes';

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

const expectedRevPrograms = new Set(pagesList.map((p) => p.revenue_program.name));

describe('Donation pages list', () => {
  beforeEach(() => {
    cy.forceLogin(hubAdminUser);
    cy.intercept(getEndpoint(LIST_PAGES), { fixture: 'pages/list-pages-1' }).as('listPages');
    //cy.intercept(getEndpoint(LIST_STYLES), { fixture: 'styles/list-styles-1.json' }).as('listStyles');
    cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: hubAdminWithContentFlag });

    cy.visit(CONTENT_SLUG);
    cy.url().should('include', CONTENT_SLUG);
    cy.wait('@listPages');
    //cy.wait('@listStyles');
  });

  it('should render the pages list component', () => {
    cy.getByTestId('pages-list').should('exist');
  });

  it('should render an accordion for each revenue program', () => {
    expectedRevPrograms.forEach((rpName) => {
      cy.getByTestId(`rev-list-${rpName}`).should('exist');
    });
  });

  it('should render accordions open to start', () => {
    expectedRevPrograms.forEach((rpName) => {
      cy.getByTestId(`${rpName}-pages-list`).should('exist');
    });
  });

  it('should collapse accordions when headings are clicked', () => {
    const closedRevProgram = [...expectedRevPrograms][0];
    const openRevProgram = [...expectedRevPrograms][1];
    cy.getByTestId(`rev-list-heading-${closedRevProgram}`).click();
    cy.getByTestId(`${closedRevProgram}-pages-list`).should('not.exist');
    cy.getByTestId(`${openRevProgram}-pages-list`).should('exist');
    // cleanup
    cy.getByTestId(`rev-list-heading-${closedRevProgram}`).click();
  });

  it('should show a card for each page per revenue program', () => {
    expectedRevPrograms.forEach((rpName) => {
      const expectedPages = pagesList.filter((p) => p.revenue_program.name === rpName);
      expectedPages.forEach((p) => {
        cy.getByTestId(`${rpName}-pages-list`).contains(p.name);
      });
    });
  });

  it('should show page preview thumbnail if present, filler if not', () => {
    const pagesWithoutImages = pagesList.filter((p) => !p.page_screenshot);
    const pagesWithImages = pagesList.filter((p) => p.page_screenshot);

    pagesWithoutImages.forEach((p) => {
      cy.getByTestId(`page-card-${p.id}`).within(() => {
        cy.getByTestId('page-card-no-img').contains('No preview');
      });
    });

    pagesWithImages.forEach((p) => {
      cy.getByTestId(`page-card-${p.id}`).within(() => {
        cy.getByTestId('page-card-img');
      });
    });
  });
});
