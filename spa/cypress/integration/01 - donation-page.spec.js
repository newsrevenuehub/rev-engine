import { STRIPE_PAYMENT, LIVE_PAGE_DETAIL } from 'ajax/endpoints';
import { getEndpoint, getPageElementByType, getTestingDonationPageUrl, EXPECTED_RP_SLUG } from '../support/util';
import livePageOne from '../fixtures/pages/live-page-1.json';

// Constants
import { CLEARBIT_SCRIPT_SRC } from '../../src/hooks/useClearbit';
import { FUNDJOURNALISM_404_REDIRECT } from 'components/common/LivePage404';

import * as freqUtils from 'utilities/parseFrequency';
import calculateStripeFee from 'utilities/calculateStripeFee';

const expectedPageSlug = 'page-slug';

describe('Contribution happy path user flow', () => {
  // have expected page state using page that features all types inclusive of sidebar
  // user fills out and submits form
});

// thank you page?

// when amount query param included -- or can this be a unit teset
// describe('')

//   it('should not show nyt comp subscription option if not enabled', () => {
//     const page = { ...livePageOne };
//     const swagIndex = page.elements.findIndex((el) => el.type === 'DSwag');
//     page.elements[swagIndex].content.offerNytComp = false;
//     cy.intercept({ method: 'GET', pathname: getEndpoint(LIVE_PAGE_DETAIL) }, { body: page, statusCode: 200 }).as(
//       'getPage'
//     );
//     cy.visit(getTestingDonationPageUrl(expectedPageSlug));
//     cy.url().should('include', EXPECTED_RP_SLUG);
//     cy.url().should('include', expectedPageSlug);
//     cy.wait('@getPage');

//     cy.setUpDonation('One time', '365');
//     cy.getByTestId('nyt-comp-sub').should('not.exist');
//   });

//   it('should not show nyt comp subscription option if enabled', () => {
//     const page = { ...livePageOne };
//     const swagIndex = page.elements.findIndex((el) => el.type === 'DSwag');
//     page.elements[swagIndex].content.offerNytComp = true;
//     cy.intercept({ method: 'GET', pathname: getEndpoint(LIVE_PAGE_DETAIL) }, { body: page, statusCode: 200 }).as(
//       'getPage'
//     );
//     cy.visit(getTestingDonationPageUrl(expectedPageSlug));
//     cy.url().should('include', EXPECTED_RP_SLUG);
//     cy.url().should('include', expectedPageSlug);
//     cy.wait('@getPage');

//     cy.setUpDonation('One time', '365');
//     cy.getByTestId('nyt-comp-sub').should('exist');
//   });
// });

// describe('404 behavior', () => {
//   it('should show 404 if request live page returns 404', () => {
//     cy.intercept(
//       { method: 'GET', pathname: getEndpoint(LIVE_PAGE_DETAIL) },
//       { fixture: 'pages/live-page-1', statusCode: 404 }
//     ).as('getLivePage');
//     cy.visit(getTestingDonationPageUrl(expectedPageSlug));
//     cy.url().should('include', EXPECTED_RP_SLUG);
//     cy.url().should('include', expectedPageSlug);
//     cy.wait('@getLivePage');
//     cy.getByTestId('live-page-404').should('exist');
//   });
// });

// salesforce

// it('should pass salesforce campaign id from query parameter to request body', () => {
//   const sfCampaignId = 'my-test-sf-campaign-id';
//   cy.intercept(
//     { method: 'GET', pathname: `${getEndpoint(LIVE_PAGE_DETAIL)}**` },
//     { fixture: 'pages/live-page-1', statusCode: 200 }
//   ).as('getPageDetail');
//   cy.visit(getTestingDonationPageUrl(expectedPageSlug, `?campaign=${sfCampaignId}`));
//   cy.url().should('include', EXPECTED_RP_SLUG);
//   cy.url().should('include', expectedPageSlug);
//   cy.url().should('include', sfCampaignId);
//   cy.wait('@getPageDetail');

//   const interval = 'One time';
//   const amount = '120';

//   cy.intercept(
//     { method: 'POST', pathname: getEndpoint(STRIPE_PAYMENT) },
//     { fixture: 'stripe/payment-intent', statusCode: 200 }
//   ).as('stripePaymentWithSfId');
//   cy.setUpDonation(interval, amount);
//   cy.makeDonation().then(() => {
//     cy.wait('@stripePaymentWithSfId').its('request.body').should('have.property', 'sf_campaign_id', sfCampaignId);
//   });
// });
