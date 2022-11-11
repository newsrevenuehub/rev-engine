// Util
import { getEndpoint } from '../support/util';
import { getFrequencyAdjective } from 'utilities/parseFrequency';

// Fixtures
import livePage from '../fixtures/pages/live-page-1.json';
import unpublishedPage from '../fixtures/pages/unpublished-page-1.json';

// Constants
import {
  DELETE_PAGE,
  DRAFT_PAGE_DETAIL,
  PATCH_PAGE,
  LIST_FONTS,
  LIST_PAGES,
  LIST_STYLES,
  TEMPLATES,
  USER
} from 'ajax/endpoints';
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

const testEditPageUrl = 'edit/my/page/';

describe('Contribution page edit', () => {
  before(() => {
    cy.forceLogin(orgAdminUser);
    cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: stripeVerifiedOrgAdmin });
    cy.intercept({ method: 'GET', pathname: getEndpoint(LIST_STYLES) }, {});

    cy.intercept(
      { method: 'GET', pathname: `${getEndpoint(DRAFT_PAGE_DETAIL)}**` },
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
        { method: 'GET', pathname: `${getEndpoint(DRAFT_PAGE_DETAIL)}**` },
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
    before(() => {
      cy.getByTestId('edit-page-button').click();
    });

    it('should render layout and setup tabs', () => {
      cy.getByTestId('edit-layout-tab');
      cy.getByTestId('edit-setup-tab');
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
        cy.contains('Contribution Frequency');
      });

      it('should validate frequency', () => {
        // Uncheck all the frequencies
        cy.getByTestId('frequency-toggle').click({ multiple: true });
        cy.getByTestId('keep-element-changes-button').click({ force: true });
        cy.getByTestId('alert').contains('You must have at least');
      });

      it('should accept valid input and changes should show on page', () => {
        // Now check one and accept
        cy.intercept(`**/${LIST_STYLES}**`, {});
        cy.getByTestId('frequency-toggle').contains('One time').click();
        cy.getByTestId('keep-element-changes-button').click({ force: true });

        // Contribution page should only show item checked, and nothing else.
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
      cy.intercept(`**/${LIST_STYLES}**`, {});
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

  describe('Contributor info editor', () => {
    it('should render the DonorInfoEditor', () => {
      cy.editElement('DDonorInfo');
      cy.getByTestId('donor-info-editor').should('exist');
      cy.getByTestId('discard-element-changes-button').click();
    });
  });

  describe('Contributor address editor', () => {
    it('should render the DonorAmountEditor', () => {
      cy.editElement('DDonorAddress');
      cy.getByTestId('donor-address-editor').should('exist');
      cy.getByTestId('discard-element-changes-button').click();
    });
  });

  describe('Payment editor', () => {
    beforeEach(() => cy.getByTestId('edit-page-button').click());

    it('should render the PaymentEditor', () => {
      cy.editElement('DPayment');
      cy.getByTestId('payment-editor').should('exist');
      cy.getByTestId('discard-element-changes-button').click();
    });

    it('should disable the checkbox to default paying fees if paying fees is turned off', () => {
      cy.editElement('DPayment');
      cy.getByTestId('payment-editor').get('.checkbox').first().click();
      cy.getByTestId('pay-fees-by-default').get('input[type="checkbox"]').should('be.disabled');
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
      expect(livePage.allow_offer_nyt_comp).to.be.null;
      cy.getByTestId('offer-nyt-comp').should('not.exist');
    });

    it('should show option to enable NYT sub if RP has enabled it', () => {
      const page = { ...livePage };
      page.allow_offer_nyt_comp = true;

      cy.forceLogin(orgAdminUser);
      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: orgAdminWithContentFlag });
      cy.intercept(
        { method: 'GET', pathname: `${getEndpoint(DRAFT_PAGE_DETAIL)}**` },
        { body: page, statusCode: 200 }
      ).as('getPage');
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
      cy.intercept({ method: 'GET', pathname: getEndpoint(DRAFT_PAGE_DETAIL) }, { body: page, statusCode: 200 }).as(
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
      cy.getByTestId('keep-element-changes-button').click({ force: true });

      // Save changes
      cy.getByTestId('save-page-button').click();

      // Expect alert
      cy.getByTestId('missing-elements-alert').should('exist');
      cy.getByTestId('missing-elements-alert').contains('Payment');

      // Cleanup
      // this closes the alert
      cy.findByRole('alert').findByRole('button', { name: /x/ }).click();
      cy.getByTestId('edit-page-button').click();
      cy.getByTestId('add-page-element-button').click();
    });

    it('should open appropriate tab for error and scroll to first error', () => {
      const fixture = { ...unpublishedPage, plan: { ...unpublishedPage.plan, custom_thank_you_page_enabled: true } };
      cy.intercept({ method: 'GET', pathname: getEndpoint(DRAFT_PAGE_DETAIL) }, { body: fixture }).as('getPageDetail');
      cy.forceLogin(orgAdminUser);
      cy.intercept(`**/${LIST_STYLES}**`, {});

      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: orgAdminWithContentFlag });
      cy.visit(testEditPageUrl);
      cy.wait('@getPageDetail');
      cy.getByTestId('edit-page-button').click();
      cy.getByTestId('edit-setup-tab').click({ force: true });
      cy.getByTestId('thank-you-redirect-link-input').type('not a valid url');
      cy.get('#edit-setup-tab-panel').within(() =>
        cy.getByTestId('keep-element-changes-button').click({ force: true })
      );

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
    before(() => {
      cy.forceLogin(orgAdminUser);
      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: orgAdminWithContentFlag });
      cy.intercept({ method: 'GET', pathname: getEndpoint(LIST_STYLES) }, {});

      cy.intercept(
        { method: 'GET', pathname: getEndpoint(DRAFT_PAGE_DETAIL) },
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

    it('Can add an element', () => {
      cy.intercept({ method: 'GET', pathname: getEndpoint(LIST_STYLES) }, {});

      cy.getByTestId('add-sidebar-element-button').click();
      cy.getByTestId('add-page-modal').within(() => {
        cy.getByTestId('page-item-DRichText').click();
      });
      cy.getByTestId('preview-page-button').click();
      cy.get('[data-testid=donation-page__sidebar] > ul > li').should('have.length', 3);
    });

    it('can be added to the page', () => {
      cy.intercept({ method: 'GET', pathname: getEndpoint(LIST_STYLES) }, {});

      cy.getByTestId('edit-page-button').click({ force: true });
      cy.getByTestId('edit-sidebar-tab').click({ force: true });
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

describe('Edit interface: Setup', () => {
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
    cy.intercept(
      { method: 'GET', pathname: getEndpoint(DRAFT_PAGE_DETAIL) },
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
    cy.getByTestId('setup-heading-input').type(newHeading);
    cy.get('#edit-setup-tab-panel').within(() =>
      cy.getByTestId('keep-element-changes-button').scrollIntoView().click()
    );
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
    cy.getByTestId('edit-layout-tab').click();
    cy.getByTestId('trash-button').first().click();
    cy.getByTestId('save-page-button').click();
    cy.getByTestId('confirmation-modal').contains("You're making changes to a live contribution page. Continue?");
    cy.getByTestId('cancel-button').click();
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
    cy.intercept(
      { method: 'GET', pathname: getEndpoint(DRAFT_PAGE_DETAIL) },
      { body: pageDetailBody, statusCode: 200 }
    ).as('getPageDetail');
    cy.intercept({ method: 'GET', pathname: getEndpoint(LIST_STYLES) }, [{ name: 'mock-style' }]);

    cy.visit(testEditPageUrl);

    cy.url().should('include', testEditPageUrl);
    cy.getByTestId('edit-page-button').click();
    cy.getByTestId('edit-style-tab').click({ force: true });
  });

  describe('When creating a new style', () => {
    beforeEach(() => {
      cy.intercept({ method: 'GET', pathname: getEndpoint(LIST_FONTS) }, { body: [] });
      cy.getByTestId('add-element-button').click();
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
    cy.intercept({ method: 'DELETE', pathname: getEndpoint(`${DELETE_PAGE}*/`) }, { statusCode: 204 }).as('deletePage');
    cy.intercept({ method: 'GET', pathname: getEndpoint(LIST_PAGES) }, { body: [], statusCode: 200 });
  });
  it('should delete an unpublished page when delete button is pushed', () => {
    cy.intercept(
      { method: 'GET', pathname: getEndpoint(DRAFT_PAGE_DETAIL) },
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
      { method: 'GET', pathname: getEndpoint(DRAFT_PAGE_DETAIL) },
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
  before(() => {
    cy.forceLogin(orgAdminUser);
    cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: orgAdminWithContentFlag });
    cy.intercept(
      { method: 'GET', pathname: getEndpoint(DRAFT_PAGE_DETAIL) },
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
  before(() => {
    cy.forceLogin(orgAdminUser);
    cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: orgAdminWithContentFlag });
    cy.intercept(
      { method: 'GET', pathname: getEndpoint(DRAFT_PAGE_DETAIL) },
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
