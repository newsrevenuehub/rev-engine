import { FULL_PAGE } from 'ajax/endpoints';
import { getEndpoint } from '../support/util';
import livePage from '../fixtures/pages/live-page-1';

describe('Donation page edit', () => {
  before(() => {
    cy.login('user/stripe-verified.json');
    cy.intercept(
      { method: 'GET', pathname: getEndpoint(FULL_PAGE) },
      { fixture: 'pages/live-page-1', statusCode: 200 }
    );
    cy.visit('edit/my/page');
  });

  it('should render page edit buttons', () => {
    cy.getByTestId('preview-page-button');
    cy.getByTestId('edit-page-button');
    cy.getByTestId('save-page-button');
  });

  it('should open edit interface when clicking edit button', () => {
    cy.getByTestId('edit-page-button').click();
    cy.getByTestId('edit-interface');
  });

  it('should close edit interface when clicking preview button', () => {
    cy.getByTestId('preview-page-button').click();
    cy.getByTestId('edit-interface').should('not.exist');
  });

  describe('Edit interface', () => {
    before(() => {
      cy.getByTestId('edit-page-button').click();
    });

    it('should render layout and setup tabs', () => {
      cy.getByTestId('layout-tab');
      cy.getByTestId('setup-tab');
    });

    it('should render element detail when item is clicked', () => {
      cy.contains('Rich text').click();
      cy.getByTestId('element-properties');
    });
  });

  describe('Validations', () => {
    it('should render an alert with a list of missing required elements', () => {
      const missingElementType = 'DPayment';
      const page = { ...livePage };

      // Remove element from elements list and set as fixture
      page.elements = page.elements.filter((el) => el.type !== missingElementType);
      cy.intercept({ method: 'GET', pathname: getEndpoint(FULL_PAGE) }, { body: page, statusCode: 200 }).as(
        'getPageDetail'
      );
      cy.login('user/stripe-verified.json');
      cy.visit('edit/my/page');
      cy.wait('@getPageDetail');

      // Need to add fake an update to the page to enable
      cy.getByTestId('edit-page-button').click();
      cy.contains('Rich text').click();
      cy.getByTestId('save-element-changes-button').click();
      cy.getByTestId('save-page-button').click();
      cy.getByTestId('missing-elements-alert').should('exist');
      cy.getByTestId('missing-elements-alert').contains('Payment');
    });
  });
});
