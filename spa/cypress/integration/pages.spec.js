import { getEndpoint } from '../support/util';
import { LIST_PAGES } from 'ajax/endpoints';
import pagesList from '../fixtures/pages/list-pages-1.json';

const expectedRevPrograms = new Set(pagesList.map((p) => p.revenue_program.name));

describe('Donation pages list', () => {
  beforeEach(() => {
    cy.login('user/stripe-verified.json');
    cy.intercept(getEndpoint(LIST_PAGES), { fixture: 'pages/list-pages-1' }).as('listPages');
    cy.visit('/dashboard/pages/');
    cy.url().should('include', '/dashboard/pages/');
    cy.wait('@listPages');
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
