// FIXME in DEV-3494
/* eslint-disable cypress/unsafe-to-chain-command */

// Util
import { getEndpoint } from '../support/util';

// Fixtures
import livePage from '../fixtures/pages/live-page-1.json';
import unpublishedPage from '../fixtures/pages/unpublished-page-1.json';

// Constants
import { DELETE_PAGE, PATCH_PAGE, LIST_FONTS, LIST_PAGES, LIST_STYLES, USER } from 'ajax/endpoints';
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
    cy.intercept({ method: 'GET', pathname: getEndpoint(LIST_FONTS) }, []);
    cy.intercept(
      { method: 'GET', pathname: `${getEndpoint(LIST_PAGES)}**` },
      { fixture: 'pages/live-page-1', statusCode: 200 }
    ).as('getPage');

    const route = testEditPageUrl;
    cy.visit(route);
    cy.url().should('include', route);
    return cy.wait('@getPage');
  });

  it('should default to the edit interface once a page has loaded', () => {
    cy.getByTestId('edit-interface');
  });

  describe('Currency display', () => {
    const testAmounts = ['amount-120-selected', 'amount-180', 'amount-365', 'amount-other'];

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
      cy.getByTestId('edit-settings-tab');
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
      cy.intercept(`${getEndpoint(LIST_STYLES)}**`, {});

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
      cy.intercept(`${getEndpoint(LIST_STYLES)}**`, {});

      cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: orgAdminWithContentFlag });
      cy.visit(testEditPageUrl);
      cy.wait('@getPageDetail');
      cy.getByTestId('edit-page-button').click();
      cy.getByTestId('edit-settings-tab').click({ force: true });
      cy.findByRole('textbox', { name: 'Thank You page link' }).type(
        'https://valid-url-but-intercept-will-dislikeit.org'
      );
      cy.get('#edit-settings-tab-panel').within(() =>
        cy.findByRole('button', { name: 'Update' }).click({ force: true })
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

      // Now we should see the Settings tab and our error message
      cy.getByTestId('edit-interface').should('exist');
      cy.get('#page-setup-thank_you_redirect-helper-text').contains(expectedErrorMessage);
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

describe('Edit interface: Settings', () => {
  const imageFieldNames = ['Main header background', 'Graphic'];
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
    cy.getByTestId('edit-settings-tab').click({ force: true });
  });

  it('should show a warning when updating a live page', () => {
    cy.intercept({ method: 'GET', pathname: getEndpoint(LIST_STYLES) }, {});
    cy.getByTestId('edit-layout-tab').click({ force: true });
    cy.getByTestId('trash-button').first().click();
    cy.getByTestId('save-page-button').click();
    cy.getByTestId('confirmation-modal').contains("You're making changes to a live contribution page. Continue?");
    cy.getByTestId('cancel-button').click();
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
    cy.getByTestId('edit-settings-tab').click({ force: true });
    cy.findAllByLabelText('Remove').filter(':enabled').click({ multiple: true, force: true });
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

      for (const field of ['graphic', 'header_bg_image']) {
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
    cy.getByTestId('edit-settings-tab').click({ force: true });
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
    cy.intercept({ method: 'GET', pathname: getEndpoint(LIST_FONTS) }, [{ id: 1, name: 'Custom Font' }]);

    cy.visit(testEditPageUrl);

    cy.url().should('include', testEditPageUrl);
    cy.getByTestId('edit-page-button').click();
    cy.getByTestId('edit-style-tab').click({ force: true });
  });
});

describe('Contribution page delete', () => {
  beforeEach(() => {
    cy.forceLogin(orgAdminUser);
    cy.intercept({ method: 'GET', pathname: getEndpoint(USER) }, { body: orgAdminWithContentFlag });
    cy.intercept({ method: 'GET', pathname: getEndpoint('/revenue-programs/*/mailchimp_configure/') }, {});
    cy.intercept({ method: 'DELETE', pathname: getEndpoint(`${DELETE_PAGE}*/`) }, { statusCode: 204 }).as('deletePage');
    cy.intercept({ method: 'GET', pathname: getEndpoint(LIST_PAGES) }, { body: [], statusCode: 200 });
    cy.intercept({ method: 'GET', pathname: getEndpoint(LIST_FONTS) }, []);
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
    cy.intercept(`${getEndpoint(LIST_STYLES)}**`, {});

    cy.visit(testEditPageUrl);
    cy.wait(['@getPage']);
    cy.getByTestId('delete-page-button').click();

    cy.getByTestId('confirmation-modal').contains(DELETE_LIVE_PAGE_CONFIRM_TEXT).getByTestId('continue-button').click();
    cy.intercept({ method: 'DELETE', pathname: getEndpoint(`${LIST_STYLES}*/`) }, { statusCode: 204 });
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
    cy.intercept(`${getEndpoint(LIST_STYLES)}**`, {});

    cy.visit(testEditPageUrl);
    cy.url().should('include', testEditPageUrl);
    cy.wait('@getPageDetail');
  });

  it('should NOT contain clearbit.js script in body', () => {
    cy.get('head').find(`script[src*="${CLEARBIT_SCRIPT_SRC}"]`).should('have.length', 0);
  });
});
