import { FULL_PAGE, DONOR_BENEFITS, CONTRIBUTION_META } from 'ajax/endpoints';
import { getEndpoint } from '../support/util';
import { getFrequencyAdjective } from 'utilities/parseFrequency';
import { format } from 'date-fns';
import livePage from '../fixtures/pages/live-page-1.json';

describe('Donation page edit', () => {
  before(() => {
    cy.login('user/stripe-verified.json');
    cy.intercept(
      { method: 'GET', pathname: getEndpoint(FULL_PAGE) },
      { fixture: 'pages/live-page-1', statusCode: 200 }
    );
    cy.intercept(
      { method: 'GET', pathname: getEndpoint(DONOR_BENEFITS) },
      { fixture: 'org/donor-benefits-1.json', statusCode: 200 }
    ).as('getDonorBenefits');
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

  describe('Edit interface: Elements', () => {
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
          cy.contains(amountToRemove).find("[data-testid='x-button']").click();
          cy.contains(amountToRemove).should('not.exist');
          // cy.getByTestId('x-button').click()
        });
    });

    it('should add an amount', () => {
      const amountToAdd = 5;
      cy.contains('One time')
        .siblings('div')
        .within(() => {
          cy.getByTestId('amount-input').type(amountToAdd);
          cy.getByTestId('add-button').click();
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
        .each(() => {
          cy.getByTestId('x-button').first().click();
        });

      cy.contains('One time').siblings('ul').children();
      cy.getByTestId('discard-element-changes-button').click();
    });
  });

  describe('Donor info editor', () => {
    it('should render the DonorInfoEditor', () => {
      cy.contains('Donor info').click();
      cy.getByTestId('donor-info-editor');
      cy.getByTestId('discard-element-changes-button').click();
    });
  });

  describe('Payment editor', () => {
    it('should render the PaymentEditor', () => {
      cy.contains('Payment').click();
      cy.getByTestId('payment-editor');
      cy.getByTestId('discard-element-changes-button').click();
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
      cy.intercept(
        { method: 'GET', pathname: getEndpoint(DONOR_BENEFITS) },
        { fixture: 'org/donor-benefits-1.json', statusCode: 200 }
      ).as('getDonorBenefits');
      cy.login('user/stripe-verified.json');
      cy.visit('edit/my/page');
      cy.wait('@getPageDetail');

      // Need to add fake an update to the page to enable
      cy.getByTestId('edit-page-button').click();
      cy.contains('Rich text').click();
      cy.getByTestId('keep-element-changes-button').click();
      cy.getByTestId('save-page-button').click();
      cy.getByTestId('missing-elements-alert').should('exist');
      cy.getByTestId('missing-elements-alert').contains('Payment');
      cy.getByTestId('edit-page-button').click();
      cy.getByTestId('add-element-button').click();
      cy.getByTestId('edit-interface-item').contains('Payment').click({ force: true });
    });
  });

  describe('Edit interface: Setup', () => {
    before(() => {
      cy.getByTestId('edit-page-button').click({ force: true });
      cy.getByTestId('setup-tab').click({ force: true });
    });
    it('should render the setup tab when setup tab clicked', () => {
      cy.getByTestId('page-setup');
    });
    it('should pre-fill incoming data', () => {
      const expectedHeading = livePage.heading;
      cy.getByTestId('setup-heading-input').should('have.value', expectedHeading);
    });
    it('should update donation page view with new content', () => {
      const previousHeading = livePage.heading;
      const newHeading = 'My new test heading';
      cy.getByTestId('setup-heading-input').clear();
      cy.getByTestId('setup-heading-input').type(newHeading);
      cy.getByTestId('keep-element-changes-button').scrollIntoView().click();
      cy.getByTestId('s-page-heading').contains(previousHeading).should('not.exist');
      cy.getByTestId('s-page-heading').contains(newHeading);
    });
    it('should show expected, formatted publication date', () => {
      const rawDate = livePage.published_date;
      const expectedFormat = format(new Date(rawDate), "LLL do, yyyy 'at' hh:mm a");
      cy.getByTestId('setup-tab').click();
      cy.getByTestId('publish-widget').scrollIntoView();
      cy.getByTestId('publish-widget').contains(expectedFormat);
    });
    it('should show a warning when updating a live page', () => {
      cy.getByTestId('publish-widget').click();
      cy.contains('18').click();
      cy.getByTestId('keep-element-changes-button').click();
      cy.getByTestId('save-page-button').click();
      cy.getByTestId('confirmation-modal').contains("You're making changes to a live donation page. Continue?");
      cy.getByTestId('cancel-button').click();
    });
  });
});

describe('Additional Info Setup', () => {
  before(() => {
    cy.login('user/stripe-verified.json');
    cy.intercept(
      { method: 'GET', pathname: getEndpoint(FULL_PAGE) },
      { fixture: 'pages/live-page-1', statusCode: 200 }
    );
    cy.intercept(
      { method: 'GET', pathname: getEndpoint(CONTRIBUTION_META) },
      { fixture: 'donations/contribution-metadata.json', statusCode: 200 }
    ).as('getContributionMeta');
    cy.visit('edit/my/page');
  });

  it('additional-info-applied should be empty', () => {
    cy.getByTestId('edit-page-button').click();
    cy.getByTestId('layout-tab').click();
    cy.getByTestId('edit-interface-item').contains('Additional').click();
    cy.getByTestId('additional-info-applied').should('exist').find('li').should('have.length', 0);
  });

  it('should have two items available to add', () => {
    cy.get('#downshift-1-toggle-button').click();
    cy.get('#downshift-1-menu').find('li').should('have.length', 2);
  });

  it('click on one should add to additional-applied-info', () => {
    cy.get('li').first().contains('In Honor of').click();
    cy.getByTestId('additional-info-applied').should('exist').contains('In Honor of');
  });

  it('should now only have one item available to add', () => {
    cy.get('#downshift-1-toggle-button').click();
    cy.get('#downshift-1-menu').find('li').should('have.length', 1);
  });
});
