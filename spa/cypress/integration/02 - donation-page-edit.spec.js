// Util
import { getEndpoint } from '../support/util';
import { getFrequencyAdjective } from 'utilities/parseFrequency';
import { format } from 'date-fns';

// Fixtures
import livePage from '../fixtures/pages/live-page-1.json';
import unpublishedPage from '../fixtures/pages/unpublished-page-1.json';

// Contsants
import { DELETE_PAGE, DRAFT_PAGE_DETAIL, PATCH_PAGE, LIST_PAGES, TEMPLATES } from 'ajax/endpoints';
import { DELETE_CONFIRM_MESSAGE } from 'components/pageEditor/PageEditor';
import { CONTENT_SLUG } from 'routes';
import { CLEARBIT_SCRIPT_SRC } from 'hooks/useClearbit';

describe('Donation page edit', () => {
  before(() => {
    cy.login('user/stripe-verified.json');
    cy.intercept(
      { method: 'GET', pathname: `${getEndpoint(DRAFT_PAGE_DETAIL)}**` },
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
    cy.getByTestId('clone-page-button');
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

    it('should render element detail when edit item is clicked', () => {
      cy.editElement('DRichText');
      cy.getByTestId('element-properties');
      cy.getByTestId('discard-element-changes-button').click();
    });

    describe('Frequency editor', () => {
      it('should render the frequency editor when edit item is clicked', () => {
        cy.editElement('DFrequency');
        cy.getByTestId('frequency-editor');
        cy.contains('Donation frequency');
      });

      it('should validate frequency', () => {
        // Uncheck all the frequencies
        cy.getByTestId('frequency-toggle').click({ multiple: true });
        cy.getByTestId('keep-element-changes-button').click({ force: true });
        cy.getByTestId('alert').contains('You must have at least');
      });

      it('should accept valid input and changes should show on page', () => {
        // Now check one and accept
        cy.getByTestId('frequency-toggle').contains('One time').click();
        cy.getByTestId('keep-element-changes-button').click({ force: true });

        // Donation page should only show item checked, and nothing else.
        cy.getByTestId('d-frequency').contains('One time');
        cy.getByTestId('d-frequency').should('not.contain', 'Monthly');
        cy.getByTestId('d-frequency').should('not.contain', 'Yearly');

        // Cleanup
        cy.editElement('DFrequency');
        cy.getByTestId('frequency-toggle').contains('Monthly').click();
        cy.getByTestId('frequency-toggle').contains('Yearly').click();
        cy.getByTestId('keep-element-changes-button').click({ force: true });
      });
    });
  });

  describe('Amount editor', () => {
    const amountElement = livePage.elements.find((el) => el.type === 'DAmount');
    const options = amountElement.content.options;

    before(() => {
      cy.editElement('DFrequency');
      cy.getByTestId('frequency-editor').find('li').first().click();
      cy.getByTestId('frequency-editor').find('li').click({ multiple: true });
      cy.getByTestId('keep-element-changes-button').click({ force: true });
    });

    it('should render the amount editor', () => {
      cy.editElement('DAmount');
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
      cy.editElement('DDonorInfo');
      cy.getByTestId('donor-info-editor').should('exist');
      cy.getByTestId('discard-element-changes-button').click();
    });
  });

  describe('Donor address editor', () => {
    it('should render the DonorAmountEditor', () => {
      cy.editElement('DDonorAddress');
      cy.getByTestId('donor-address-editor').should('exist');
      cy.getByTestId('discard-element-changes-button').click();
    });
  });

  describe('Payment editor', () => {
    it('should render the PaymentEditor', () => {
      cy.editElement('DPayment');
      cy.getByTestId('payment-editor').should('exist');
      cy.getByTestId('discard-element-changes-button').click();
    });
  });

  describe('Swag editor', () => {
    const pageSwagElement = livePage.elements.filter((el) => el.type === 'DSwag')[0];
    before(() => {
      cy.getByTestId('edit-page-button').click();
      cy.editElement('DSwag');
    });

    it('should render the swag editor', () => {
      cy.getByTestId('swag-editor').should('exist');
    });

    it('should show existing swags', () => {
      const swagName = pageSwagElement.content.swags[0].swagName;
      cy.getByTestId('swag-editor').getByTestId('existing-swag').contains(swagName);
    });

    // Update me when we increase this limit!
    it('should only show add-option if there is fewer than 1 existing swag', () => {
      const swagName = pageSwagElement.content.swags[0].swagName;
      cy.getByTestId('swag-name-input').should('not.exist');
      cy.getByTestId(`remove-existing-swag-${swagName}`).click();
      cy.getByTestId('swag-editor').getByTestId('existing-swag').should('not.exist');
      cy.getByTestId('swag-name-input').should('exist');
    });

    it('should not show option to enable NYT sub if RP has not enabled it', () => {
      expect(livePage.allow_offer_nyt_comp).to.be.false;
      cy.getByTestId('offer-nyt-comp').should('not.exist');
    });

    it('should show option to enable NYT sub if RP has enabled it', () => {
      const page = { ...livePage };
      page.allow_offer_nyt_comp = true;

      cy.login('user/stripe-verified.json');
      cy.intercept(
        { method: 'GET', pathname: `${getEndpoint(DRAFT_PAGE_DETAIL)}**` },
        { body: page, statusCode: 200 }
      ).as('getPage');
      cy.visit('edit/my/page');
      cy.url().should('include', 'edit/my/page');
      cy.wait('@getPage');

      cy.getByTestId('edit-page-button').click();
      cy.editElement('DSwag');
      cy.getByTestId('offer-nyt-comp').should('exist');
    });
  });

  describe('Validations', () => {
    it('should render an alert with a list of missing required elements', () => {
      const missingElementType = 'DPayment';
      const page = { ...livePage };

      // Remove element from elements list and set as fixture
      page.elements = page.elements.filter((el) => el.type !== missingElementType);
      cy.intercept({ method: 'GET', pathname: getEndpoint(DRAFT_PAGE_DETAIL) }, { body: page, statusCode: 200 }).as(
        'getPageDetail'
      );
      cy.login('user/stripe-verified.json');
      cy.visit('edit/my/page');
      cy.wait('@getPageDetail');

      // Need to fake an update to the page to enable save
      cy.getByTestId('edit-page-button').click();
      cy.editElement('DRichText');

      // Accept changes
      cy.getByTestId('keep-element-changes-button').click({ force: true });

      // Save changes
      cy.getByTestId('save-page-button').click();

      // Expect alert
      cy.getByTestId('missing-elements-alert').should('exist');
      cy.getByTestId('missing-elements-alert').contains('Payment');

      // Cleanup
      cy.getByTestId('edit-page-button').click();
      cy.wait(300);
      cy.getByTestId('add-element-button').click();
      cy.contains('Payment').click();
    });

    it('should open appropriate tab for error and scroll to first error', () => {
      cy.intercept(
        { method: 'GET', pathname: getEndpoint(DRAFT_PAGE_DETAIL) },
        { fixture: 'pages/unpublished-page-1.json' }
      ).as('getPageDetail');
      cy.login('user/stripe-verified.json');
      cy.visit('edit/my/page');
      cy.wait('@getPageDetail');
      cy.getByTestId('edit-page-button').click();
      cy.getByTestId('setup-tab').click({ force: true });
      cy.getByTestId('thank-you-redirect-link-input').type('not a valid url');
      cy.getByTestId('keep-element-changes-button').click({ force: true });

      // Before we save, let's close the tab so we can more meaningfully assert its presence later.
      cy.getByTestId('preview-page-button').click({ force: true });
      cy.getByTestId('edit-interface').should('not.exist');

      const expectedErrorMessage = 'Enter a valid URL.';
      cy.intercept(
        { method: 'PATCH', pathname: `${getEndpoint(PATCH_PAGE)}${unpublishedPage.id}/` },
        { body: { header_link: [expectedErrorMessage] }, statusCode: 400 }
      ).as('patchPage');

      // Save
      cy.getByTestId('save-page-button').click({ force: true });
      cy.wait('@patchPage');

      // Now we should see the Setup tab and our error message
      cy.getByTestId('edit-interface').should('exist');
      cy.getByTestId('errors-Thank You page link').contains(expectedErrorMessage);
    });

    it('should catch missing elements and an element that has not been configured.', () => {
      cy.intercept(
        { method: 'GET', pathname: getEndpoint(DRAFT_PAGE_DETAIL) },
        { fixture: 'pages/live-page-element-validation.json' }
      ).as('getPageDetailModified');
      cy.login('user/stripe-verified.json');
      cy.visit('edit/my/page');
      cy.wait('@getPageDetailModified');
      // Need to fake an update to the page to enable save
      cy.getByTestId('edit-page-button').click();
      cy.editElement('DRichText');

      // Accept changes
      cy.getByTestId('keep-element-changes-button').click({ force: true });

      // Save changes
      cy.getByTestId('save-page-button').click();
      cy.getByTestId('missing-elements-alert').should('exist').contains('Payment');
      cy.getByTestId('missing-elements-alert').contains('Payment');
      cy.getByTestId('missing-elements-alert').contains('Donation frequency');
      cy.getByTestId('missing-elements-alert').contains('Donation amount');
    });
  });

  describe('Edit interface: Setup', () => {
    before(() => {
      cy.login('user/stripe-verified.json');
      cy.intercept(
        { method: 'GET', pathname: getEndpoint(DRAFT_PAGE_DETAIL) },
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
      cy.getByTestId('keep-element-changes-button').click({ force: true });
      cy.getByTestId('save-page-button').click();
      cy.getByTestId('confirmation-modal').contains("You're making changes to a live donation page. Continue?");
      cy.getByTestId('cancel-button').click();
    });
  });

  describe('Edit interface: Sidebar', () => {
    before(() => {
      cy.login('user/stripe-verified.json');
      cy.intercept(
        { method: 'GET', pathname: getEndpoint(DRAFT_PAGE_DETAIL) },
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

    it('Can add an element', () => {
      cy.getByTestId('add-element-button').click();
      cy.getByTestId('add-page-modal').within(() => {
        cy.getByTestId('page-item-DRichText').click();
      });
      cy.getByTestId('preview-page-button').click();
      cy.get('[data-testid=donation-page__sidebar] > ul > li').should('have.length', 3);
    });

    it('can be added to the page', () => {
      cy.getByTestId('edit-page-button').click({ force: true });
      cy.getByTestId('sidebar-tab').click({ force: true });
      cy.editElement('DRichText');
      cy.get('[class=DraftEditor-editorContainer]').type('New Rich Text');
      cy.getByTestId('keep-element-changes-button').click();
      cy.getByTestId('preview-page-button').click();
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
      { method: 'GET', pathname: getEndpoint(DRAFT_PAGE_DETAIL) },
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
      { method: 'GET', pathname: getEndpoint(DRAFT_PAGE_DETAIL) },
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

describe('Page load side effects', () => {
  before(() => {
    cy.login('user/stripe-verified.json');
    cy.intercept(
      { method: 'GET', pathname: getEndpoint(DRAFT_PAGE_DETAIL) },
      { fixture: 'pages/live-page-1', statusCode: 200 }
    ).as('getPageDetail');
    cy.visit('edit/my/page');
    cy.url().should('include', 'edit/my/page');
    cy.wait('@getPageDetail');
  });
  it('should NOT contain clearbit.js script in body', () => {
    cy.get('head').find(`script[src*="${CLEARBIT_SCRIPT_SRC}"]`).should('have.length', 0);
  });
});

describe('Template from page', () => {
  beforeEach(() => {
    cy.login('user/stripe-verified.json');
    cy.intercept(
      { method: 'GET', pathname: getEndpoint(DRAFT_PAGE_DETAIL) },
      { fixture: 'pages/live-page-1', statusCode: 200 }
    ).as('getPageDetail');
    cy.visit('edit/my/page');
    cy.url().should('include', 'edit/my/page');
    cy.wait('@getPageDetail');
  });

  it('should show warning if page edits are unsaved', () => {
    cy.getByTestId('edit-page-button').click();
    cy.editElement('DRichText');
    cy.getByTestId('keep-element-changes-button').click({ force: true });
    cy.getByTestId('clone-page-button').click({ force: true });
    cy.getByTestId('confirmation-modal').should('exist');
  });

  it('should show template creation modal if continue is clicked', () => {
    cy.getByTestId('clone-page-button').click({ force: true });
    cy.getByTestId('template-create-modal').should('exist');
  });
  it('should show make request with page pk in body when template saved', () => {
    cy.getByTestId('clone-page-button').click({ force: true });
    cy.getByTestId('template-create-modal').should('exist');
    cy.intercept({
      method: 'POST',
      pathname: getEndpoint(TEMPLATES)
    }).as('createTemplate');
    cy.getByTestId('save-template-button').click();
    cy.wait('@createTemplate').then(({ request }) => {
      expect(request.body).to.have.property('page_pk');
      expect(request.body.page_pk).to.equal(livePage.id);
      expect(request.body).to.have.property('name');
      expect(request.body.name).to.equal(livePage.name);
    });
  });
});

describe('ReasonEditor', () => {
  before(() => {
    cy.login('user/stripe-verified.json');
    cy.intercept(
      { method: 'GET', pathname: getEndpoint(DRAFT_PAGE_DETAIL) },
      { fixture: 'pages/live-page-1', statusCode: 200 }
    ).as('getPageDetail');
    cy.visit('edit/my/page');
    cy.url().should('include', 'edit/my/page');
    cy.wait('@getPageDetail');
    cy.getByTestId('edit-page-button').click();
    cy.editElement('DReason');
  });

  it('should render the ReasonEditor', () => {
    cy.getByTestId('reason-editor').should('exist');
  });

  it('should show the three "ask-" checkboxes', () => {
    cy.getByTestId('ask-reason').should('exist');
    cy.getByTestId('ask-honoree').should('exist');
    cy.getByTestId('ask-in-memory-of').should('exist');
  });

  it('should only show reason for giving options if ask-reason is checked', () => {
    cy.getByTestId('ask-reason')
      .get('input')
      .then(($input) => {
        expect($input).to.be.checked;
      });
    cy.getByTestId('create-reasons').should('exist');

    cy.getByTestId('ask-reason').click();
    cy.getByTestId('create-reasons').should('not.exist');
  });
});
