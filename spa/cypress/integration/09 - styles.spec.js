import { getEndpoint } from '../support/util';
import { LIST_PAGES, LIST_FONTS, LIST_STYLES, USER } from 'ajax/endpoints';
import { CUSTOMIZE_SLUG } from 'routes';
import stylesList from '../fixtures/styles/list-styles-1.json';

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

const [styleA] = stylesList;

describe('Styles list', () => {
  beforeEach(() => {
    cy.forceLogin(hubAdminUser);
    cy.intercept(getEndpoint(LIST_STYLES), { fixture: 'styles/list-styles-1' }).as('listStyles');
    cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: hubAdminWithContentFlag });
    cy.intercept({ method: 'GET', pathname: getEndpoint(LIST_PAGES) }, {});
    cy.intercept({ method: 'GET', pathname: getEndpoint(LIST_FONTS) }, {});
    cy.visit(CUSTOMIZE_SLUG);
    cy.url().should('include', CUSTOMIZE_SLUG);
    cy.wait('@listStyles');
  });

  it('should render the styles list', () => {
    cy.getByTestId('styles-list').should('exist');
  });

  it('should open edit modal when style is clicked', () => {
    cy.get(`button[aria-label="${styleA.name}"]`).click();
    cy.getByTestId('edit-styles-modal-update').should('exist');
    cy.getByTestId('close-modal').click();
  });

  it('should open edit modal when plus button is clicked', () => {
    cy.get('button[aria-label="New Style"]').click();
    cy.getByTestId('edit-styles-modal-create').should('exist');
    cy.getByTestId('close-modal').click();
  });

  it('should render an icon if the style is used on a live page', () => {
    const liveStyle = stylesList.find((style) => style.used_live);
    const liveStyleId = liveStyle.id;
    cy.getByTestId(`style-${liveStyleId}-live`).should('exist');
  });
});
