// FIXME in DEV-3494
/* eslint-disable cypress/unsafe-to-chain-command */

// Util
import { getEndpoint } from '../support/util';

// Fixtures
import livePage from '../fixtures/pages/live-page-1.json';
import unpublishedPage from '../fixtures/pages/unpublished-page-1.json';

// Constants
import { DELETE_PAGE, PATCH_PAGE, LIST_FONTS, LIST_PAGES, LIST_STYLES, TEMPLATES, USER } from 'ajax/endpoints';
import { DELETE_LIVE_PAGE_CONFIRM_TEXT } from 'constants/textConstants';
import { CONTENT_SLUG } from 'routes';
import { CLEARBIT_SCRIPT_SRC } from 'hooks/useClearbit';

import orgAdminUser from '../fixtures/user/login-success-org-admin.json';
import stripeVerifiedOrgAdmin from '../fixtures/user/self-service-user-stripe-verified.json';

import { CONTENT_SECTION_ACCESS_FLAG_NAME } from 'constants/featureFlagConstants';

import pageDetail from '../fixtures/pages/live-page-1.json';

const contentSectionFlag = {
  id: '5678',
  name: CONTENT_SECTION_ACCESS_FLAG_NAME
};

const orgAdminWithContentFlag = {
  ...orgAdminUser['user'],
  flags: [{ ...contentSectionFlag }]
};

const orgAdminStripeVerifiedLoginSuccess = {
  ...orgAdminUser,
  user: {
    ...orgAdminUser.user,
    flags: [{ ...contentSectionFlag }],
    revenue_programs: [
      {
        id: 1,
        name: 'Some Rev Program',
        slug: 'some-rev-program',
        organization: 1,
        payment_provider_stripe_verified: true
      }
    ]
  }
};

const testEditPageUrl = 'edit/pages/123';

describe('Contribution page edit', () => {
  beforeEach(() => {
    cy.forceLogin(orgAdminUser);
    cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: stripeVerifiedOrgAdmin });
    cy.intercept({ method: 'GET', pathname: getEndpoint('/revenue-programs/*/mailchimp_configure/') }, {});
    cy.intercept({ method: 'GET', pathname: getEndpoint(LIST_STYLES) }, {});
    cy.intercept(
      { method: 'GET', pathname: `${getEndpoint(LIST_PAGES)}**` },
      { fixture: 'pages/live-page-1', statusCode: 200 }
    ).as('getPage');

    const route = testEditPageUrl;
    cy.visit(route);
    cy.url().should('include', route);
    return cy.wait('@getPage');
  });

  it('should render page edit buttons', () => {
    cy.getByTestId('preview-page-button');
    cy.getByTestId('edit-page-button');
    cy.getByTestId('save-page-button');
    cy.getByTestId('delete-page-button');
  });

  it('should disable the save button before any edits are made', () => {
    // The disabled button isn't a button at all--just a <div>.

    cy.get('button[data-testid="save-page-button"]').should('not.exist');
    cy.get('div[data-testid="save-page-button"]').should('exist');
  });

  it('should default to the edit interface once a page has loaded', () => {
    cy.getByTestId('edit-interface');
  });

  it('should open edit interface when clicking edit button', () => {
    // Toggle out of edit mode.

    cy.getByTestId('preview-page-button').click();
    cy.getByTestId('edit-page-button').click();
    cy.getByTestId('edit-interface');
  });

  it('should close edit interface when clicking preview button', () => {
    cy.getByTestId('preview-page-button').click();
    cy.getByTestId('edit-interface').should('not.exist');
  });

  describe('Currency display', () => {
    const testAmounts = ['amount-120-selected', 'amount-180', 'amount-365', 'amount-other'];

    it('displays the currency symbol defined in the page data', () => {
      for (const amount of testAmounts) {
        cy.getByTestId(amount).should('contain', livePage.currency.symbol);
      }
    });

    it("defaults to $ as currency symbol if it's not defined", () => {
      // Have to re-run the entire before() process, but with different API
      // data.

      cy.forceLogin(orgAdminUser);
      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: orgAdminWithContentFlag });
      cy.intercept({ method: 'GET', pathname: getEndpoint(LIST_STYLES) }, {});
      cy.intercept(
        { method: 'GET', pathname: `${getEndpoint(LIST_PAGES)}**` },
        { body: { ...livePage, currency: null }, statusCode: 200 }
      ).as('getPage');

      const route = testEditPageUrl;

      cy.visit(route);
      cy.url().should('include', route);
      cy.wait('@getPage');

      for (const amount of testAmounts) {
        cy.getByTestId(amount).should('not.contain', livePage.currency.symbol);
        cy.getByTestId(amount).should('contain', '$');
      }
    });
  });

  describe('Dynamic page title', () => {
    it('should display page name and revenue program name in page title', () => {
      cy.title().should('eq', `Edit | ${livePage.name} | ${livePage.revenue_program.name} | RevEngine`);
    });
  });

  describe('Edit interface: Elements', () => {
    beforeEach(() => {
      cy.getByTestId('edit-page-button').click();
    });

    it('should render layout and setup tabs', () => {
      cy.getByTestId('edit-layout-tab');
      cy.getByTestId('edit-setup-tab');
    });

    it('should add elements to the editor tab', () => {
      let existingElementsLength = 0;

      cy.findByRole('tabpanel', { name: 'Layout' }).then((layoutPanel) => {
        cy.wrap(layoutPanel)
          .find('ul li')
          .then(({ length }) => (existingElementsLength = length))
          .then(() => cy.findByRole('tabpanel', { name: 'Layout' }).findByRole('button', { name: 'Add Block' }).click())
          .then(() => cy.getByTestId('add-page-modal').within(() => cy.getByTestId('page-item-DRichText').click()))
          .then(() =>
            cy.findByRole('tabpanel', { name: 'Layout' }).within(() => {
              cy.get('ul li').should('have.length', existingElementsLength + 1);
            })
          );
      });
    });

    it('should add elements to the page preview', () => {
      let existingElementsLength = 0;

      cy.getByTestId('donation-page')
        .find('main ul > li')
        .then(({ length }) => (existingElementsLength = length))
        .then(() => cy.findByRole('tabpanel', { name: 'Layout' }).findByRole('button', { name: 'Add Block' }).click())
        .then(() => cy.getByTestId('add-page-modal').within(() => cy.getByTestId('page-item-DRichText').click()))
        .then(() =>
          cy
            .getByTestId('donation-page')
            .find('main ul > li')
            .should('have.length', existingElementsLength + 1)
        );
    });

    it('should render element detail when edit item is clicked', () => {
      cy.editElement('DRichText');
      cy.getByTestId('element-properties').should('exist');
    });

    describe('Frequency editor', () => {
      beforeEach(() => cy.editElement('DFrequency'));

      it('should render the frequency editor when edit item is clicked', () => {
        cy.getByTestId('frequency-editor');
        cy.contains('Contribution Frequency');
      });

      it('should validate frequency', () => {
        // Uncheck all the frequencies
        cy.findByRole('checkbox', { name: 'One time payments enabled' }).click();
        cy.findByRole('checkbox', { name: 'Monthly payments enabled' }).click();
        cy.findByRole('checkbox', { name: 'Yearly payments enabled' }).click();

        cy.findByText('You must have at least 1 frequency enabled.');
        cy.findByRole('button', { name: 'Update' }).should('be.disabled');
      });

      it('should accept valid input and changes should show on page', () => {
        // Make a change and save it.
        cy.findByRole('checkbox', { name: 'Monthly payments enabled' }).click();
        cy.findByRole('checkbox', { name: 'Yearly payments enabled' }).click();
        cy.findByRole('button', { name: 'Update' }).click();

        // Contribution page should only show item checked, and nothing else.
        cy.getByTestId('d-frequency').contains('One time');
        cy.getByTestId('d-frequency').should('not.contain', 'Monthly');
        cy.getByTestId('d-frequency').should('not.contain', 'Yearly');
      });
    });
  });

  describe('Amount editor', () => {
    const amountElement = livePage.elements.find((el) => el.type === 'DAmount');
    const options = amountElement.content.options;

    beforeEach(() => {
      cy.intercept(`**/${LIST_STYLES}**`, {});
      cy.editElement('DAmount');
    });

    it('should render the amount editor', () => {
      cy.getByTestId('amount-editor');
    });

    it('should show existing frequencies and amounts', () => {
      for (const frequency in options) {
        if (frequency === 'other') {
          continue;
        }

        cy.getByTestId(`amount-interval-${frequency}`).within(() =>
          options[frequency].forEach((amount) => {
            cy.contains(amount);
          })
        );
      }
    });

    it('should remove an amount when the remove button is clicked', () => {
      const amountToRemove = 120;

      cy.getByTestId('amount-interval-one_time').within(() => {
        cy.findByRole('button', { name: `Remove ${amountToRemove}` }).click();
        cy.contains(amountToRemove).should('not.exist');
      });
    });

    it('should add an amount', () => {
      const amountToAdd = 5;

      cy.getByTestId('amount-interval-one_time').within(() => {
        cy.findByLabelText('Add amount').type(amountToAdd);
        cy.findByLabelText('Add').click();
        cy.contains(amountToAdd);
      });
    });

    it('should prevent user from removing last amount in list', () => {
      cy.getByTestId('amount-interval-one_time').within(() => {
        cy.findAllByRole('button', { name: /Remove/ }).each((el) => cy.wrap(el).click({ force: true }));
        // This is the last amount in the fixture.
        cy.contains('365');
      });
    });
  });

  describe('Contributor info editor', () => {
    it('should render the contributor info editor', () => {
      cy.editElement('DDonorInfo');
      cy.getByTestId('contributor-info-editor').should('exist');
    });
  });

  describe('Contributor address editor', () => {
    it('should render the DonorAddressEditor', () => {
      cy.editElement('DDonorAddress');
      cy.getByTestId('donor-address-editor').should('exist');
    });
  });

  describe('Payment editor', () => {
    beforeEach(() => cy.getByTestId('edit-page-button').click());

    it('should render the PaymentEditor', () => {
      cy.editElement('DPayment');
      cy.getByTestId('payment-editor').should('exist');
    });

    it('should disable the checkbox to default paying fees if paying fees is turned off', () => {
      cy.editElement('DPayment');
      cy.findByRole('checkbox', { name: 'Offer option to pay payment provider fees' }).click();
      cy.findByRole('checkbox', { name: 'Selected by default' }).should('be.disabled');
    });
  });

  describe('Swag editor', () => {
    const pageSwagElement = livePage.elements.filter((el) => el.type === 'DSwag')[0];

    beforeEach(() => {
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
      expect(livePage.allow_offer_nyt_comp).to.be.null;
      cy.getByTestId('offer-nyt-comp').should('not.exist');
    });

    it('should show option to enable NYT sub if RP has enabled it', () => {
      const page = { ...livePage };
      page.allow_offer_nyt_comp = true;

      cy.forceLogin(orgAdminUser);
      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: orgAdminWithContentFlag });
      cy.intercept({ method: 'GET', pathname: `${getEndpoint(LIST_PAGES)}**` }, { body: page, statusCode: 200 }).as(
        'getPage'
      );
      cy.intercept(`**/${LIST_STYLES}**`, {});

      cy.visit(testEditPageUrl);
      cy.url().should('include', testEditPageUrl);
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
      cy.intercept({ method: 'GET', pathname: `${getEndpoint(LIST_PAGES)}**` }, { body: page, statusCode: 200 }).as(
        'getPageDetail'
      );
      cy.intercept(`**/${LIST_STYLES}**`, {});

      cy.forceLogin(orgAdminUser);
      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: orgAdminWithContentFlag });
      cy.visit(testEditPageUrl);
      cy.wait('@getPageDetail');

      // Need to fake an update to the page to enable save
      cy.getByTestId('edit-page-button').click();
      cy.editElement('DRichText');

      // Accept changes
      cy.findByRole('button', { name: 'Update' }).click({ force: true });

      // Save changes
      cy.getByTestId('save-page-button').click();

      // Expect alert
      cy.findByRole('alert').should('exist').contains('Payment');
    });

    it('should open appropriate tab for error and scroll to first error', () => {
      const fixture = { ...unpublishedPage, plan: { ...unpublishedPage.plan, custom_thank_you_page_enabled: true } };
      cy.intercept({ method: 'GET', pathname: `${getEndpoint(LIST_PAGES)}**` }, { body: fixture }).as('getPageDetail');
      cy.forceLogin(orgAdminUser);
      cy.intercept(`**/${LIST_STYLES}**`, {});

      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: orgAdminWithContentFlag });
      cy.visit(testEditPageUrl);
      cy.wait('@getPageDetail');
      cy.getByTestId('edit-page-button').click();
      cy.getByTestId('edit-setup-tab').click({ force: true });
      cy.getByTestId('thank-you-redirect-link-input').type('https://valid-url-but-intercept-will-dislikeit.org');
      cy.get('#edit-setup-tab-panel').within(() => cy.findByRole('button', { name: 'Update' }).click({ force: true }));

      // Before we save, let's close the tab so we can more meaningfully assert its presence later.
      cy.getByTestId('preview-page-button').click({ force: true });
      cy.getByTestId('edit-interface').should('not.exist');

      const expectedErrorMessage = 'Enter a valid URL.';
      cy.intercept(
        { method: 'PATCH', pathname: `${getEndpoint(PATCH_PAGE)}${unpublishedPage.id}/` },
        { body: { thank_you_redirect: [expectedErrorMessage] }, statusCode: 400 }
      ).as('patchPage');

      // Save
      cy.getByTestId('save-page-button').click({ force: true });
      cy.wait('@patchPage');

      // Now we should see the Setup tab and our error message
      cy.getByTestId('edit-interface').should('exist');
      cy.getByTestId('errors-Thank You page link').contains(expectedErrorMessage);
    });
  });

  describe('Edit interface: Sidebar', () => {
    beforeEach(() => {
      cy.forceLogin(orgAdminUser);
      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: orgAdminWithContentFlag });
      cy.intercept({ method: 'GET', pathname: getEndpoint(LIST_STYLES) }, {});

      cy.intercept(
        { method: 'GET', pathname: `${getEndpoint(LIST_PAGES)}**` },
        { fixture: 'pages/live-page-1', statusCode: 200 }
      ).as('getPageDetail');
      cy.visit(testEditPageUrl);
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
      cy.getByTestId('edit-sidebar-tab').click({ force: true });
    });

    it('should add elements to the editor tab', () => {
      let existingElementsLength = 0;

      cy.getByTestId('edit-sidebar-tab')
        .click({ force: true })
        .then(() =>
          cy.findByRole('tabpanel', { name: 'Sidebar' }).then((sidebarPanel) => {
            cy.wrap(sidebarPanel)
              .find('ul li')
              .then(({ length }) => (existingElementsLength = length))
              .then(() =>
                cy.findByRole('tabpanel', { name: 'Sidebar' }).findByRole('button', { name: 'Add Block' }).click()
              )
              .then(() => cy.getByTestId('add-page-modal').within(() => cy.getByTestId('page-item-DRichText').click()))
              .then(() =>
                cy.findByRole('tabpanel', { name: 'Sidebar' }).within(() => {
                  cy.get('ul li').should('have.length', existingElementsLength + 1);
                })
              );
          })
        );
    });

    it('should add elements to the page preview', () => {
      let existingElementsLength = 0;

      cy.getByTestId('edit-sidebar-tab')
        .click({ force: true })
        .then(() =>
          cy
            .getByTestId('donation-page__sidebar')
            .find('ul > li')
            .then(({ length }) => (existingElementsLength = length))
            .then(() =>
              cy.findByRole('tabpanel', { name: 'Sidebar' }).findByRole('button', { name: 'Add Block' }).click()
            )
            .then(() => cy.getByTestId('add-page-modal').within(() => cy.getByTestId('page-item-DRichText').click()))
            .then(() =>
              cy
                .getByTestId('donation-page__sidebar')
                .find('ul > li')
                .should('have.length', existingElementsLength + 1)
            )
        );
    });
  });
});

describe('Edit interface: Setup', () => {
  const imageFieldNames = ['Main header background', 'Main header logo', 'Graphic'];
  const textFieldNames = ['Form panel heading', 'Form panel heading', 'Post Thank You redirect'];

  beforeEach(() => {
    const pageDetailBody = {
      ...pageDetail,
      revenue_program: {
        ...pageDetail.revenue_program,
        id: orgAdminStripeVerifiedLoginSuccess.user.revenue_programs[0].id
      }
    };
    cy.forceLogin(orgAdminStripeVerifiedLoginSuccess);
    cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: orgAdminStripeVerifiedLoginSuccess.user });
    cy.intercept({ method: 'GET', pathname: getEndpoint('/revenue-programs/*/mailchimp_configure/') }, {});
    cy.intercept(
      { method: 'GET', pathname: `${getEndpoint(LIST_PAGES)}**` },
      { body: pageDetailBody, statusCode: 200 }
    ).as('getPageDetail');
    cy.intercept({ method: 'GET', pathname: getEndpoint(LIST_STYLES) }, {});

    cy.visit(testEditPageUrl);

    cy.url().should('include', testEditPageUrl);
    // cy.wait('@getPageDetail');
    cy.getByTestId('edit-page-button').click();
    cy.getByTestId('edit-setup-tab').click({ force: true });
  });

  it('should render the setup tab when setup tab clicked', () => {
    cy.getByTestId('page-setup');
  });

  it('should pre-fill incoming data', () => {
    const expectedHeading = livePage.heading;
    cy.getByTestId('setup-heading-input').should('have.value', expectedHeading);
  });

  it('should update contribution page view with new content and display it in preview mode', () => {
    const previousHeading = livePage.heading;
    const newHeading = 'My new test heading';
    cy.intercept({ method: 'GET', pathname: getEndpoint(LIST_STYLES) }, {});
    cy.intercept({ method: 'GET', pathname: getEndpoint(TEMPLATES) }, {});

    cy.getByTestId('s-page-heading').contains(previousHeading);
    cy.getByTestId('setup-heading-input').clear();
    cy.getByTestId('setup-heading-input').type(newHeading, { force: true });
    cy.get('#edit-setup-tab-panel').within(() => cy.findByRole('button', { name: 'Update' }).scrollIntoView().click());
    cy.getByTestId('s-page-heading').contains(previousHeading).should('not.exist');
    cy.getByTestId('s-page-heading').contains(newHeading);

    // Make sure update is reflected in preview:
    cy.getByTestId('save-page-button').click();
    cy.getByTestId('s-page-heading').contains(newHeading);
    cy.getByTestId('cancel-button').click();
    cy.getByTestId('s-page-heading').contains(newHeading);

    // Go back to edit mode
    cy.getByTestId('edit-page-button').click();
  });

  it('should show a warning when updating a live page', () => {
    cy.intercept({ method: 'GET', pathname: getEndpoint(LIST_STYLES) }, {});
    cy.getByTestId('edit-layout-tab').click({ force: true });
    cy.getByTestId('trash-button').first().click();
    cy.getByTestId('save-page-button').click();
    cy.getByTestId('confirmation-modal').contains("You're making changes to a live contribution page. Continue?");
    cy.getByTestId('cancel-button').click();
  });

  it("disables the Undo button if the user hasn't made a change", () => {
    cy.findByRole('button', { name: 'Undo' }).should('be.disabled');
  });

  for (const label of imageFieldNames) {
    const mockFile = { contents: Cypress.Buffer.from('mock-image'), fileName: 'image.jpeg', lastModified: Date.now() };

    it(`enables the Undo button when the user selects an image for "${label}"`, () => {
      // Inputs are hidden from view.
      cy.findByLabelText(label).selectFile(mockFile, { force: true });
      cy.findByRole('button', { name: 'Undo' }).should('not.be.disabled');
    });
  }

  for (const name of textFieldNames) {
    it(`enables the Undo button when the user edits "${name}"`, () => {
      cy.findByRole('textbox', { name }).scrollIntoView().type('change');
      cy.findByRole('button', { name: 'Undo' }).should('not.be.disabled');
    });
  }

  it('resets changes when the Undo button is clicked', () => {
    for (const label of imageFieldNames) {
      const mockFile = {
        contents: Cypress.Buffer.from('mock-image'),
        fileName: `image-${label}.jpeg`,
        lastModified: Date.now()
      };

      cy.findByLabelText(label).selectFile(mockFile, { force: true });
      cy.findByAltText(`image-${label}.jpeg`).should('exist');
    }

    for (const name of textFieldNames) {
      cy.findByRole('textbox', { name }).type('change', { force: true });
    }

    cy.findByRole('button', { name: 'Undo' }).click();
    cy.findByLabelText('Form panel heading').should('have.value', pageDetail.heading);
    cy.findByLabelText('Post Thank You redirect').should('have.value', pageDetail.post_thank_you_redirect);

    // The underlying file inputs will not have changed value, because
    // JavaScript can't change a file input's value. We check values indirectly
    // by verifying the image previews are now gone.

    for (const label of imageFieldNames) {
      cy.findByAltText(`image-${label}.jpeg`).should('not.exist');
    }
  });

  it('sends blank strings for the appropriate fields when images are removed', () => {
    // Have to re-run the entire before() process, but with different API
    // data.

    cy.forceLogin(orgAdminUser);
    cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: orgAdminWithContentFlag });
    cy.intercept({ method: 'GET', pathname: getEndpoint(LIST_STYLES) }, {});
    cy.intercept(
      { method: 'GET', pathname: `${getEndpoint(LIST_PAGES)}**` },
      {
        body: {
          ...livePage,
          graphic: 'mock-image-url.jpeg',
          graphic_thumbnail: 'mock-image-url.jpeg',
          header_bg_image: 'mock-image-url.jpeg',
          header_bg_image_thumbnail: 'mock-image-url.jpeg',
          header_logo: 'mock-image-url.jpeg',
          header_logo_thumbnail: 'mock-image-url.jpeg'
        },
        statusCode: 200
      }
    ).as('getPage');
    cy.intercept(
      { method: 'PATCH', pathname: `${getEndpoint(PATCH_PAGE)}${livePage.id}/` },
      { body: livePage, statusCode: 200 }
    ).as('patchPage');

    const route = testEditPageUrl;

    cy.visit(route);
    cy.url().should('include', route);
    cy.wait('@getPage');
    cy.getByTestId('edit-page-button').click();
    cy.getByTestId('edit-setup-tab').click({ force: true });
    cy.findAllByLabelText('Remove').filter(':enabled').click({ multiple: true });
    // Accept changes
    cy.findByRole('button', { name: 'Update' }).click({ force: true });

    // Save changes
    cy.getByTestId('save-page-button').click();
    cy.findByText('Continue').click();
    cy.wait('@patchPage').then(({ request }) => {
      // This request is sent as multipart form data, so we assert on its
      // contents. If we end up doing this a lot, it might be worth it to bring
      // in a module to parse the response.
      //
      // The intent here is to test we are sending an empty value, not the
      // string 'undefined' or something else.

      for (const field of ['graphic', 'header_bg_image', 'header_logo']) {
        expect(request.body).to.include(`Content-Disposition: form-data; name="${field}"\r\n\r\n\r\n------`);
      }
    });
  });

  it('only sends blank strings for removed images', () => {
    // Have to re-run the entire before() process, but with different API
    // data.

    cy.forceLogin(orgAdminUser);
    cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: orgAdminWithContentFlag });
    cy.intercept({ method: 'GET', pathname: getEndpoint(LIST_STYLES) }, {});
    cy.intercept(
      { method: 'GET', pathname: `${getEndpoint(LIST_PAGES)}**` },
      {
        body: {
          ...livePage,
          graphic: 'mock-image-url.jpeg',
          graphic_thumbnail: 'mock-image-url.jpeg',
          header_bg_image: 'mock-image-url.jpeg',
          header_bg_image_thumbnail: 'mock-image-url.jpeg',
          header_logo: 'mock-image-url.jpeg',
          header_logo_thumbnail: 'mock-image-url.jpeg'
        },
        statusCode: 200
      }
    ).as('getPage');
    cy.intercept(
      { method: 'PATCH', pathname: `${getEndpoint(PATCH_PAGE)}${livePage.id}/` },
      { body: livePage, statusCode: 200 }
    ).as('patchPage');

    const route = testEditPageUrl;

    cy.visit(route);
    cy.url().should('include', route);
    cy.wait('@getPage');
    cy.getByTestId('edit-page-button').click();
    cy.getByTestId('edit-setup-tab').click({ force: true });
    cy.findAllByLabelText('Remove').filter(':enabled:first').click();
    // Accept changes
    cy.findByRole('button', { name: 'Update' }).click({ force: true });

    // Save changes
    cy.getByTestId('save-page-button').click();
    cy.findByText('Continue').click();
    cy.wait('@patchPage').then(({ request }) => {
      // This is the first image input in the Page Setup tab.
      expect(request.body).to.include('Content-Disposition: form-data; name="header_bg_image"\r\n\r\n\r\n------');
    });
  });
});

describe('Edit interface: Styles', () => {
  beforeEach(() => {
    const pageDetailBody = {
      ...pageDetail,
      revenue_program: {
        ...pageDetail.revenue_program,
        id: orgAdminStripeVerifiedLoginSuccess.user.revenue_programs[0].id
      }
    };
    cy.forceLogin(orgAdminStripeVerifiedLoginSuccess);
    cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: orgAdminStripeVerifiedLoginSuccess.user });
    cy.intercept({ method: 'GET', pathname: getEndpoint('/revenue-programs/*/mailchimp_configure/') }, {});
    cy.intercept(
      { method: 'GET', pathname: `${getEndpoint(LIST_PAGES)}**` },
      { body: pageDetailBody, statusCode: 200 }
    ).as('getPageDetail');
    cy.intercept({ method: 'GET', pathname: getEndpoint(LIST_STYLES) }, [{ name: 'mock-style' }]);

    cy.visit(testEditPageUrl);

    cy.url().should('include', testEditPageUrl);
    cy.getByTestId('edit-page-button').click();
    cy.getByTestId('edit-style-tab').click({ force: true });
  });

  it("disables the Undo button if the user hasn't made a change", () => {
    cy.findByRole('button', { name: 'Undo' }).should('be.disabled');
  });

  it('enables the Undo button when the user makes a change', () => {
    cy.findByLabelText('Choose from existing styles', { selector: 'input' }).click();
    cy.findByText('----none----').click();
    cy.findByRole('button', { name: 'Undo' }).should('not.be.disabled');
  });

  it('resets changes when the Undo button is clicked', () => {
    cy.findByLabelText('Choose from existing styles', { selector: 'input' }).should('have.value', 'mock-style');
    cy.findByLabelText('Choose from existing styles', { selector: 'input' }).click();
    cy.findByText('----none----').click();
    cy.findByLabelText('Choose from existing styles', { selector: 'input' }).should('have.value', '----none----');
    cy.findByRole('button', { name: 'Undo' }).click();
    cy.findByLabelText('Choose from existing styles', { selector: 'input' }).should('have.value', 'mock-style');
  });

  describe('When creating a new style', () => {
    beforeEach(() => {
      cy.intercept({ method: 'GET', pathname: getEndpoint(LIST_FONTS) }, { body: [] });
      cy.findByRole('button', { name: 'Style' }).click();
    });

    it('reports back errors related to the style name', () => {
      cy.intercept(
        { method: 'POST', pathname: getEndpoint(LIST_STYLES) },
        { body: { name: 'mock-name-error' }, statusCode: 400 }
      );
      cy.getByTestId('save-styles-button').click();
      cy.contains('mock-name-error');
    });

    it('reports back errors related to the revenue program', () => {
      cy.intercept(
        { method: 'POST', pathname: getEndpoint(LIST_STYLES) },
        { body: { revenue_program: 'mock-rp-error' }, statusCode: 400 }
      );
      cy.getByTestId('save-styles-button').click();
      cy.contains('mock-rp-error');
    });
  });
});

describe('Contribution page delete', () => {
  beforeEach(() => {
    cy.forceLogin(orgAdminUser);
    cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: orgAdminWithContentFlag });
    cy.intercept({ method: 'GET', pathname: getEndpoint('/revenue-programs/*/mailchimp_configure/') }, {});
    cy.intercept({ method: 'DELETE', pathname: getEndpoint(`${DELETE_PAGE}*/`) }, { statusCode: 204 }).as('deletePage');
    cy.intercept({ method: 'GET', pathname: getEndpoint(LIST_PAGES) }, { body: [], statusCode: 200 });
  });

  it('should delete an unpublished page when delete button is pushed', () => {
    cy.intercept(
      { method: 'GET', pathname: `${getEndpoint(LIST_PAGES)}**` },
      { fixture: 'pages/unpublished-page-1', statusCode: 200 }
    ).as('getPage');
    cy.intercept({ method: 'GET', pathname: getEndpoint(LIST_STYLES) }, {});

    cy.visit(testEditPageUrl);
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
      { method: 'GET', pathname: `${getEndpoint(LIST_PAGES)}**` },
      { fixture: 'pages/live-page-1', statusCode: 200 }
    ).as('getPage');
    cy.intercept(`**/${LIST_STYLES}**`, {});

    cy.visit(testEditPageUrl);
    cy.wait(['@getPage']);
    cy.getByTestId('delete-page-button').click();

    cy.getByTestId('confirmation-modal').contains(DELETE_LIVE_PAGE_CONFIRM_TEXT).getByTestId('continue-button').click();
    cy.wait('@deletePage').then((interception) => {
      const pkPathIndex = interception.request.url.split('/').length - 2;
      expect(interception.request.url.split('/')[pkPathIndex]).to.equal(livePage.id.toString());
    });
    cy.location('pathname').should('eq', CONTENT_SLUG);
  });
});

describe('Page load side effects', () => {
  beforeEach(() => {
    cy.forceLogin(orgAdminUser);
    cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: orgAdminWithContentFlag });
    cy.intercept({ method: 'GET', pathname: getEndpoint('/revenue-programs/*/mailchimp_configure/') }, {});
    cy.intercept(
      { method: 'GET', pathname: `${getEndpoint(LIST_PAGES)}**` },
      { fixture: 'pages/live-page-1', statusCode: 200 }
    ).as('getPageDetail');
    cy.intercept(`**/${LIST_STYLES}**`, {});

    cy.visit(testEditPageUrl);
    cy.url().should('include', testEditPageUrl);
    cy.wait('@getPageDetail');
  });

  it('should NOT contain clearbit.js script in body', () => {
    cy.get('head').find(`script[src*="${CLEARBIT_SCRIPT_SRC}"]`).should('have.length', 0);
  });
});

describe('ReasonEditor', () => {
  beforeEach(() => {
    cy.forceLogin(orgAdminUser);
    cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: orgAdminWithContentFlag });
    cy.intercept({ method: 'GET', pathname: getEndpoint('/revenue-programs/*/mailchimp_configure/') }, {});
    cy.intercept(
      { method: 'GET', pathname: `${getEndpoint(LIST_PAGES)}**` },
      { fixture: 'pages/live-page-1', statusCode: 200 }
    ).as('getPageDetail');
    cy.intercept(`**/${LIST_STYLES}**`, {});

    cy.visit(testEditPageUrl);
    cy.url().should('include', testEditPageUrl);
    cy.wait('@getPageDetail');
    cy.getByTestId('edit-page-button').click();
    cy.editElement('DReason');
  });

  it('should render the ReasonEditor', () => {
    cy.getByTestId('reason-editor').should('exist');
  });

  it('should show the three "ask-" checkboxes', () => {
    cy.findByRole('checkbox', { name: 'Ask contributor why they are making a contribution' }).should('exist');
    cy.findByRole('checkbox', { name: 'Ask contributor if their contribution is in honor of somebody' }).should(
      'exist'
    );
    cy.findByRole('checkbox', { name: 'Ask contributor if their contribution is in memory of somebody' }).should(
      'exist'
    );
  });

  it('should only show reason for giving options if asking for a reason is checked', () => {
    cy.findByRole('checkbox', { name: 'Ask contributor why they are making a contribution' }).should('be.checked');
    cy.findByText('Add a Reason for Giving').should('exist');
    cy.findByRole('checkbox', { name: 'Ask contributor why they are making a contribution' }).click();
    cy.findByText('Add a Reason for Giving').should('not.exist');
  });
});
