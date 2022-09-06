import { getEndpoint } from '../support/util';
import { LIST_PAGES, USER } from 'ajax/endpoints';
import pagesList from '../fixtures/pages/list-pages-1.json';
import { CONTENT_SLUG } from 'routes';

import hubAdminUser from '../fixtures/user/hub-admin';
import { CONTENT_SECTION_ACCESS_FLAG_NAME } from 'constants/featureFlagConstants';

const contentSectionFlag = {
  id: '5678',
  name: CONTENT_SECTION_ACCESS_FLAG_NAME
};
const hubAdminWithContentFlag = {
  ...hubAdminUser['user'],
  flags: [{ ...contentSectionFlag }]
};

describe('Donation pages list', () => {
  beforeEach(() => {
    cy.forceLogin(hubAdminUser);
    cy.intercept(getEndpoint(LIST_PAGES), { fixture: 'pages/list-pages-1' }).as('listPages');
    cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: hubAdminWithContentFlag });

    cy.visit(CONTENT_SLUG);
    cy.url().should('include', CONTENT_SLUG);
    cy.wait('@listPages');
  });

  it('should render the pages list component', () => {
    cy.getByTestId('pages-list').should('exist');
  });

  it('should show a card for each page in every revenue program', () => {
    pagesList.forEach((page) => {
      cy.get(`button[aria-label="${page.name}"]`).should('exist');
    });
  });
});
