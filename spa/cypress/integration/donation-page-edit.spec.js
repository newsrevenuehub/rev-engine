// Util
import { getEndpoint } from '../support/util';
import { getFrequencyAdjective } from 'utilities/parseFrequency';
import { format } from 'date-fns';

// Fixtures
import livePage from '../fixtures/pages/live-page-1.json';
import unpublishedPage from '../fixtures/pages/unpublished-page-1.json';

// Contsants
import { DELETE_PAGE, FULL_PAGE, PATCH_PAGE, LIST_PAGES, CONTRIBUTION_META } from 'ajax/endpoints';
import { DELETE_CONFIRM_MESSAGE } from 'components/pageEditor/PageEditor';
import { CONTENT_SLUG } from 'routes';
import { CLEARBIT_SCRIPT_SRC } from 'hooks/useClearbit';

describe('Donation page edit', () => {
  before(() => {
    cy.login('user/stripe-verified.json');
    cy.intercept(
      { method: 'GET', pathname: `${getEndpoint(FULL_PAGE)}**` },
      { fixture: 'pages/live-page-1', statusCode: 200 }
    ).as('getPage');
    cy.visit('edit/my/page');
    cy.url().should('include', 'edit/my/page');
    return cy.wait('@getPage');
  });

  it('should render page edit buttons', () => {
    cy.getByTestId('preview-page-button');
    cy.getByTestId('edit-page-button');
    cy.getByTestId('save-page-button');
    cy.getByTestId('delete-page-button');
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
        cy.getByTestId('frequency-toggle').click({ multiple: true });
        cy.getByTestId('keep-element-changes-button').click();
        cy.getByTestId('alert').contains('You must have at least');
      });

      it('should accept valid input and changes should show on page', () => {
        // Now check one and accept
        cy.getByTestId('frequency-toggle').contains('One time').click();
        cy.getByTestId('keep-element-changes-button').click();

        // Donation page should only show item checked, and nothing else.
        cy.getByTestId('d-frequency').contains('One time');
        cy.getByTestId('d-frequency').should('not.contain', 'Monthly');
        cy.getByTestId('d-frequency').should('not.contain', 'Yearly');

        // Cleanup
        cy.contains('Donation frequency').click();
        cy.getByTestId('frequency-toggle').contains('Monthly').click();
        cy.getByTestId('frequency-toggle').contains('Yearly').click();
        cy.getByTestId('keep-element-changes-button').click();
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
        if (frequency === 'other') continue;
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
      cy.getByTestId('donor-info-editor').should('exist');
      cy.getByTestId('discard-element-changes-button').click();
    });
  });

  describe('Donor address editor', () => {
    it('should render the DonorAmountEditor', () => {
      cy.contains('Donor address').click();
      cy.getByTestId('donor-address-editor').should('exist');
      cy.getByTestId('discard-element-changes-button').click();
    });
  });

  describe('Payment editor', () => {
    it('should render the PaymentEditor', () => {
      cy.contains('Payment').click();
      cy.getByTestId('payment-editor').should('exist');
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
      cy.login('user/stripe-verified.json');
      cy.visit('edit/my/page');
      cy.wait('@getPageDetail');

      // Need to fake an update to the page to enable save
      cy.getByTestId('edit-page-button').click();
      cy.contains('Rich text').click();

      // Accept changes
      cy.getByTestId('keep-element-changes-button').click();

      // Save changes
      cy.getByTestId('save-page-button').click();

      // Expect alert
      cy.getByTestId('missing-elements-alert').should('exist');
      cy.getByTestId('missing-elements-alert').contains('Payment');

      // Cleanup
      cy.getByTestId('edit-page-button').click();
      cy.wait(300);
      cy.getByTestId('add-element-button').click();
      cy.getByTestId('edit-interface-item').contains('Payment').click({ force: true });
    });

    it('should open appropriate tab for error and scroll to first error', () => {
      cy.intercept(
        { method: 'GET', pathname: getEndpoint(FULL_PAGE) },
        { fixture: 'pages/unpublished-page-1.json' }
      ).as('getPageDetail');
      cy.login('user/stripe-verified.json');
      cy.visit('edit/my/page');
      cy.wait('@getPageDetail');
      cy.getByTestId('edit-page-button').click();
      cy.getByTestId('setup-tab').click({ force: true });
      cy.getByTestId('logo-link-input').type('not a valid url');
      cy.getByTestId('keep-element-changes-button').click();

      // Before we save, let's close the tab so we can more meaningfully assert its presence later.
      cy.getByTestId('preview-page-button').click();
      cy.getByTestId('edit-interface').should('not.exist');

      const expectedErrorMessage = 'Not a valid url';
      cy.intercept(
        { method: 'PATCH', pathname: `${getEndpoint(PATCH_PAGE)}${unpublishedPage.id}/` },
        { body: { header_link: [expectedErrorMessage] }, statusCode: 400 }
      ).as('patchPage');

      // Save
      cy.getByTestId('save-page-button').click();
      cy.wait('@patchPage');

      // Now we should see the Setup tab and our error message
      cy.getByTestId('edit-interface').should('exist');
      cy.getByTestId('errors-Logo link').contains(expectedErrorMessage);
    });
  });

  describe('Edit interface: Setup', () => {
    before(() => {
      cy.login('user/stripe-verified.json');
      cy.intercept(
        { method: 'GET', pathname: getEndpoint(FULL_PAGE) },
        { fixture: 'pages/live-page-1', statusCode: 200 }
      ).as('getPageDetail');
      cy.visit('edit/my/page');
      cy.url().should('include', 'edit/my/page');
      cy.wait('@getPageDetail');
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

  describe('Edit interface: Sidebar', () => {
    before(() => {
      cy.login('user/stripe-verified.json');
      cy.intercept(
        { method: 'GET', pathname: getEndpoint(FULL_PAGE) },
        { fixture: 'pages/live-page-1', statusCode: 200 }
      ).as('getPageDetail');
      cy.visit('edit/my/page');
      cy.wait('@getPageDetail');
    });

    it('should have two elements rendered in the sidebar', () => {
      cy.get('[data-testid=donation-page__sidebar] > ul > li')
        .should('have.length', 2)
        .first()
        .should('have.text', 'Sidebar Blurb')
        .next()
        .find('img')
        .invoke('attr', 'src')
        .should('eq', '/media/test.png');
    });

    it('should render the Sidebar tab', () => {
      cy.getByTestId('edit-page-button').click({ force: true });
      cy.getByTestId('sidebar-tab').click({ force: true });
    });

    it('should have two elements', () => {
      cy.getByTestId('edit-interface-item').should('have.length', 2);
    });

    it('Can add an element', () => {
      cy.getByTestId('add-element-button').click();
      cy.get('[data-testid=close-modal] + div').children().contains('Rich text').click();
      cy.get('[data-testid=donation-page__sidebar] > ul > li').should('have.length', 3);
    });

    it('can be added to the page', () => {
      cy.get('[data-testid=page-sidebar] > ul > li').first().click();
      cy.get('[class=DraftEditor-editorContainer]').type('New Rich Text');
      cy.get('[data-testid=keep-element-changes-button').click();
      cy.get('[data-testid=preview-page-button').click();
      cy.get('[data-testid=donation-page__sidebar] > ul > li')
        .should('have.length', 3)
        .first()
        .should('contain.text', 'New Rich Text');
    });
  });
});

describe('Donation page delete', () => {
  beforeEach(() => {
    cy.login('user/stripe-verified.json');
    cy.intercept({ method: 'DELETE', pathname: getEndpoint(`${DELETE_PAGE}*/`) }, { statusCode: 204 }).as('deletePage');
    cy.intercept({ method: 'GET', pathname: getEndpoint(LIST_PAGES) }, { body: [], statusCode: 200 });
  });
  it('should delete an unpublished page when delete button is pushed', () => {
    cy.intercept(
      { method: 'GET', pathname: getEndpoint(FULL_PAGE) },
      { fixture: 'pages/unpublished-page-1', statusCode: 200 }
    ).as('getPage');
    cy.visit('edit/my/page');
    cy.wait(['@getPage']);
    cy.getByTestId('delete-page-button').click();
    cy.wait('@deletePage').then((interception) => {
      const pkPathIndex = interception.request.url.split('/').length - 2;
      expect(interception.request.url.split('/')[pkPathIndex]).to.equal(unpublishedPage.id.toString());
    });
    cy.location('pathname').should('eq', CONTENT_SLUG);
  });
  it('should show a confirmation modal and delete a published page when delete button is pushed', () => {
    cy.intercept(
      { method: 'GET', pathname: getEndpoint(FULL_PAGE) },
      { fixture: 'pages/live-page-1', statusCode: 200 }
    ).as('getPage');
    cy.visit('edit/my/page');
    cy.wait(['@getPage']);
    cy.getByTestId('delete-page-button').click();

    cy.getByTestId('confirmation-modal').contains(DELETE_CONFIRM_MESSAGE).getByTestId('continue-button').click();
    cy.wait('@deletePage').then((interception) => {
      const pkPathIndex = interception.request.url.split('/').length - 2;
      expect(interception.request.url.split('/')[pkPathIndex]).to.equal(livePage.id.toString());
    });
    cy.location('pathname').should('eq', CONTENT_SLUG);
  });
});

describe('Additional Info Setup', () => {
  before(() => {
    cy.login('user/stripe-verified.json');
    cy.intercept(
      { method: 'GET', pathname: getEndpoint(FULL_PAGE) },
      { fixture: 'pages/live-page-1', statusCode: 200 }
    ).as('getPage');
    cy.intercept(
      { method: 'GET', pathname: getEndpoint(CONTRIBUTION_META) },
      { fixture: 'donations/contribution-metadata.json', statusCode: 200 }
    ).as('getContributionMeta');
    cy.visit('edit/my/page');
    cy.url().should('include', 'edit/my/page');
    return cy.wait(['@getPage', '@getContributionMeta']);
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
    // Cleanup
    cy.get('#downshift-1-toggle-button').click();
  });

  it('click on one should add to additional-applied-info and remove chosen from dropdown', () => {
    cy.get('#downshift-1-toggle-button').click();
    cy.get('#downshift-1-menu').find('li').first().contains('In Honor of').click();
    cy.getByTestId('additional-info-applied').should('exist').contains('In Honor of');
    cy.get('#downshift-1-toggle-button').click();
    cy.get('#downshift-1-menu').find('li').should('have.length', 1);
  });

  describe('Page load side effects', () => {
    it('should NOT contain clearbit.js script in body', () => {
      cy.get('head').find(`script[src*="${CLEARBIT_SCRIPT_SRC}"]`).should('have.length', 0);
    });
  });
});
