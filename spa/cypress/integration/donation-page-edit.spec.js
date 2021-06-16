import { FULL_PAGE } from 'ajax/endpoints';
import { getEndpoint } from '../support/util';

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
});
