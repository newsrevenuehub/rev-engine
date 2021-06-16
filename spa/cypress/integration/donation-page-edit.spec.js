import { FULL_PAGE } from 'ajax/endpoints';
import { getEndpoint } from '../support/util';
import { getFrequencyAdjective } from 'utilities/parseFrequency';
import livePage from '../fixtures/pages/live-page-1.json';

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
      cy.getByTestId('discard-element-changes-button').click();
    });

    describe('Frequency editor', () => {
      it('should render the frequency editor when item is clicked', () => {
        cy.contains('Donation frequency').click();
        cy.getByTestId('frequency-editor');
        cy.contains('Donation frequency');
      });

      it('should validate frequency', () => {
        // Uncheck all the frequencies
        cy.getByTestId('frequency-editor').find('li').click({ multiple: true });
        cy.getByTestId('keep-element-changes-button').click();
        cy.getByTestId('alert').contains('You must have at least');
      });

      it('should accept valid input and changes should show on page', () => {
        // Now check one and accept
        cy.getByTestId('frequency-editor').find('li').first().click();
        cy.getByTestId('keep-element-changes-button').click();

        // Donation page should only show item checked, and nothing else.
        cy.getByTestId('d-frequency').contains('One time');
        cy.getByTestId('d-frequency').should('not.contain', 'Monthly');
        cy.getByTestId('d-frequency').should('not.contain', 'Yearly');
      });
    });
  });

  describe('Amount editor', () => {
    const amountElement = livePage.elements.find((el) => el.type === 'DAmount');
    const options = amountElement.content.options;

    before(() => {
      cy.contains('Donation frequency').click();
      cy.getByTestId('frequency-editor').find('li').first().click();
      cy.getByTestId('frequency-editor').find('li').click({ multiple: true });
      cy.getByTestId('keep-element-changes-button').click();
    });

    it('should render the amount editor', () => {
      cy.contains('Donation amount').click();
      cy.getByTestId('amount-editor');
    });

    it('should show existing frequencies and amounts', () => {
      for (const frequency in options) {
        cy.contains(getFrequencyAdjective(frequency))
          .siblings('ul')
          .within(() =>
            options[frequency].forEach((amount) => {
              cy.contains(amount);
            })
          );
      }
    });

    it('should remove an amount when clicking x', () => {
      const amountToRemove = 120;
      cy.contains('One time')
        .siblings('ul')
        .within(() => {
          cy.contains(amountToRemove).find("[data-testid='remove-amount-button']").click();
          cy.contains(amountToRemove).should('not.exist');
          // cy.getByTestId('remove-amount-button').click()
        });
    });

    it('should add an amount', () => {
      const amountToAdd = 5;
      cy.contains('One time')
        .siblings('div')
        .within(() => {
          cy.getByTestId('amount-input').type(amountToAdd);
          cy.getByTestId('add-amount-button').click();
        });
      cy.contains('One time')
        .siblings('ul')
        .within(() => {
          cy.contains(amountToAdd);
        });
    });

    it('should prevent user from removing last amount in list', () => {
      cy.contains('One time')
        .siblings('ul')
        .children()
        .each((child) => {
          cy.getByTestId('remove-amount-button').first().click();
        });

      cy.contains('One time').siblings('ul').children();
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
