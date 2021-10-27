import { getEndpoint } from '../support/util';
import { LIST_STYLES } from 'ajax/endpoints';
import { CONTENT_SLUG } from 'routes';
import stylesList from '../fixtures/styles/list-styles-1.json';

describe('Donation pages list', () => {
  before(() => {
    cy.login('user/stripe-verified.json');
    cy.intercept(getEndpoint(LIST_STYLES), { fixture: 'styles/list-styles-1' }).as('listStyles');
    cy.visit(CONTENT_SLUG);
    cy.url().should('include', CONTENT_SLUG);
    cy.wait('@listStyles');
  });

  it('should render the styles tab', () => {
    cy.getByTestId('styles-section').should('exist');
  });

  it('should render the styles list', () => {
    cy.getByTestId('styles-list').should('exist');
  });

  it('should open edit modal when style is clicked', () => {
    cy.getByTestId('style-card-1').click();
    cy.getByTestId('edit-styles-modal-update').should('exist');
    cy.getByTestId('close-modal').click();
  });

  it('should open edit modal when plus button is clicked', () => {
    cy.getByTestId('style-create-button').click();
    cy.getByTestId('edit-styles-modal-create').should('exist');
    cy.getByTestId('close-modal').click();
  });

  it('should render an icon if the style is used on a live page', () => {
    const liveStyle = stylesList.find((style) => style.used_live);
    const liveStyleId = liveStyle.id;
    cy.getByTestId(`style-${liveStyleId}-live`).should('exist');
  });
});
