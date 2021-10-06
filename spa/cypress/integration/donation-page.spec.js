import { STRIPE_PAYMENT, LIVE_PAGE_DETAIL } from 'ajax/endpoints';
import { getEndpoint, getPageElementByType, getTestingDonationPageUrl, EXPECTED_RP_SLUG } from '../support/util';
import livePageOne from '../fixtures/pages/live-page-1.json';
import orgAccountIdFixture from '../fixtures/stripe/org-account-id.json';

// Deps
import { format } from 'date-fns';

// Constants
import { CLEARBIT_SCRIPT_SRC } from '../../src/hooks/useClearbit';
import * as socialMetaGetters from 'components/donationPage/DonationPageSocialTags';
import hubDefaultSocialCard from 'assets/images/hub-og-card.png';

import * as freqUtils from 'utilities/parseFrequency';
import calculateStripeFee from 'utilities/calculateStripeFee';

describe('Donation page', () => {
  beforeEach(() => {
    cy.intercept('/api/v1/organizations/stripe_account_id/**', { fixture: 'stripe/org-account-id.json' });
  });

  const expectedPageSlug = 'page-slug';
  describe('Routing', () => {
    it('should send a request containing the correct query params', () => {
      cy.intercept({ method: 'GET', pathname: getEndpoint(LIVE_PAGE_DETAIL) }, (req) => {
        expect(req.url).contains(`revenue_program=${EXPECTED_RP_SLUG}`);
        expect(req.url).contains(`page=${expectedPageSlug}`);
      });
      cy.visit(getTestingDonationPageUrl(expectedPageSlug));
    });

    it('should show live 404 page if api returns 404', () => {
      cy.intercept({ method: 'GET', pathname: getEndpoint(LIVE_PAGE_DETAIL) }, { statusCode: 404 }).as('getPageDetail');
      cy.visit(getTestingDonationPageUrl(expectedPageSlug));
      cy.wait('@getPageDetail');
      cy.getByTestId('live-page-404').should('exist');
    });

    it('should show a donation page if route is not reserved', () => {
      cy.intercept(
        { method: 'GET', pathname: getEndpoint(LIVE_PAGE_DETAIL) },
        { fixture: 'pages/live-page-1', statusCode: 200 }
      ).as('getPageDetail');
      cy.visit(getTestingDonationPageUrl(expectedPageSlug));
      cy.wait('@getPageDetail');
      cy.getByTestId('donation-page').should('exist');
    });

    describe('DonationPage elements', () => {
      it('should render expected rich text content', () => {
        cy.visitDonationPage();

        cy.getByTestId('d-rich-text').should('exist');
        cy.contains('Your support keeps us going!');
      });

      it('should render expected expected frequencies', () => {
        const frequency = getPageElementByType(livePageOne, 'DFrequency');
        cy.getByTestId('d-frequency');

        frequency.content.forEach((freq) => {
          cy.contains(freq.displayName);
        });
      });
      it('should render expected amounts', () => {
        const frequency = getPageElementByType(livePageOne, 'DFrequency');
        const amounts = getPageElementByType(livePageOne, 'DAmount');
        cy.getByTestId('d-amount');

        frequency.content.forEach((freq) => {
          cy.contains(freq.displayName).click();
          amounts.content.options[freq.value].forEach((amount) => cy.contains(amount));
        });
      });
      it('should render text indicating expected frequencies', () => {
        const frequency = getPageElementByType(livePageOne, 'DFrequency');
        cy.getByTestId('d-amount');

        frequency.content.forEach((freq) => {
          cy.contains(freq.displayName).click();
          const adjective = freqUtils.getFrequencyAdjective(freq.value);
          const rate = freqUtils.getFrequencyRate(freq.value);
          const adverb = freqUtils.getFrequencyAdverb(freq.value);

          cy.getByTestId('d-amount').find('h3').contains(adjective);
          if (rate) {
            cy.getByTestId('custom-amount-rate').contains(rate);
          }
          if (adverb) {
            cy.getByTestId('pay-fees').scrollIntoView().find('label').contains(adverb);
          }
        });
      });

      it('should render the correct fee base on frequency and amount', () => {
        const frequency = getPageElementByType(livePageOne, 'DFrequency');
        const amounts = getPageElementByType(livePageOne, 'DAmount');

        frequency.content.forEach((freq) => {
          cy.contains(freq.displayName).click();
          amounts.content.options[freq.value].forEach((amount) => {
            cy.contains(amount).click();
            const calculatedFee = calculateStripeFee(amount, freq.value, true);
            cy.getByTestId('pay-fees').scrollIntoView().find('label').contains(calculatedFee);
          });
        });
      });

      it('should select agreeToPayFees by default if appropriate page property is set', () => {
        const page = { ...livePageOne };
        const paymentIndex = page.elements.findIndex((el) => el.type === 'DPayment');
        page.elements[paymentIndex].content.payFeesDefault = true;
        cy.intercept({ method: 'GET', pathname: getEndpoint(LIVE_PAGE_DETAIL) }, { body: page, statusCode: 200 }).as(
          'getPageWithPayFeesDefault'
        );
        cy.visit(getTestingDonationPageUrl(expectedPageSlug));
        cy.url().should('include', EXPECTED_RP_SLUG);
        cy.url().should('include', expectedPageSlug);
        cy.wait(['@getPageWithPayFeesDefault']);

        cy.getByTestId('pay-fees-checked').should('exist');
        cy.getByTestId('pay-fees-not-checked').should('not.exist');
      });
    });

    describe('Resulting request', () => {
      it('should send a request with the expected interval', () => {
        cy.intercept(
          { method: 'GET', pathname: getEndpoint(LIVE_PAGE_DETAIL) },
          { fixture: 'pages/live-page-1', statusCode: 200 }
        ).as('getPage');

        cy.visit(getTestingDonationPageUrl(expectedPageSlug));
        cy.url().should('include', EXPECTED_RP_SLUG);
        cy.url().should('include', expectedPageSlug);
        cy.wait(500);
        cy.wait('@getPage');

        const interval = 'One time';
        const amount = '120';
        cy.interceptDonation();
        cy.setUpDonation(interval, amount);
        cy.makeDonation();
        cy.wait('@stripePayment').its('request.body').should('have.property', 'interval', 'one_time');
      });

      it('should send a request with the expected amount', () => {
        cy.intercept(
          { method: 'GET', pathname: getEndpoint(LIVE_PAGE_DETAIL) },
          { fixture: 'pages/live-page-1', statusCode: 200 }
        ).as('getPage');

        cy.visit(getTestingDonationPageUrl(expectedPageSlug));
        cy.url().should('include', EXPECTED_RP_SLUG);
        cy.url().should('include', expectedPageSlug);
        cy.wait('@getPage');

        const interval = 'One time';
        const amount = '120';
        cy.setUpDonation(interval, amount);
        cy.interceptDonation();
        cy.makeDonation();
        cy.wait('@stripePayment').its('request.body').should('have.property', 'amount', amount);
      });

      it('should send a confirmation request to Stripe with the organization stripe account id in the header', () => {
        /**
         * This tests against regressions that might cause the orgs stripe account id to not appear in the header of confirmCardPayment
         */
        cy.intercept(
          { method: 'GET', pathname: getEndpoint(LIVE_PAGE_DETAIL) },
          { fixture: 'pages/live-page-1', statusCode: 200 }
        ).as('getPage');

        cy.visit(getTestingDonationPageUrl(expectedPageSlug));
        cy.url().should('include', EXPECTED_RP_SLUG);
        cy.url().should('include', expectedPageSlug);
        cy.wait('@getPage');

        const interval = 'One time';
        const amount = '120';
        cy.setUpDonation(interval, amount);
        cy.interceptDonation();
        cy.makeDonation();
        cy.wait('@confirmCardPayment').its('request.body').should('include', orgAccountIdFixture.stripe_account_id);
      });

      it('should send a request with a Google reCAPTCHA token in request body', () => {
        cy.intercept(
          { method: 'GET', pathname: getEndpoint(LIVE_PAGE_DETAIL) },
          { fixture: 'pages/live-page-1', statusCode: 200 }
        ).as('getPage');

        cy.visit(getTestingDonationPageUrl(expectedPageSlug));
        cy.url().should('include', EXPECTED_RP_SLUG);
        cy.url().should('include', expectedPageSlug);
        cy.wait('@getPage');

        const interval = 'One time';
        const amount = '120';
        cy.setUpDonation(interval, amount);
        cy.interceptDonation();
        cy.makeDonation();
        cy.wait('@stripePayment').its('request.body').should('have.property', 'captcha_token');
      });
    });

    describe('Donation page social meta tags', () => {
      const { revenue_program } = livePageOne;
      const OG_URL = 'og:url';
      const OG_TITLE = 'og:title';
      const OG_DESC = 'og:description';
      const OG_TYPE = 'og:type';
      const OG_IMAGE = 'og:image';
      const OG_IMAGE_ALT = 'og:image:alt';
      const TW_CARD = 'twitter:card';
      const TW_SITE = 'twitter:site';
      const TW_CREATOR = 'twitter:creator';
      const expectedMetaTags = [
        OG_URL,
        OG_TITLE,
        OG_DESC,
        OG_TYPE,
        OG_IMAGE,
        OG_IMAGE_ALT,
        TW_CARD,
        TW_SITE,
        TW_CREATOR
      ];

      describe('Meta tags exist with default values', () => {
        const metaTagNameDefaultValueMap = {
          [OG_URL]: socialMetaGetters.DEFAULT_OG_URL,
          [OG_TITLE]: socialMetaGetters.getDefaultOgTitle(revenue_program.name),
          [OG_DESC]: socialMetaGetters.getDefaultOgDescription(revenue_program.name),
          [OG_TYPE]: 'website',
          [OG_IMAGE]: '/' + hubDefaultSocialCard,
          [OG_IMAGE_ALT]: socialMetaGetters.DEFAULT_OG_IMG_ALT,
          [TW_CARD]: socialMetaGetters.TWITTER_CARD_TYPE,
          [TW_SITE]: '@' + socialMetaGetters.DEFAULT_TWITTER_SITE,
          [TW_CREATOR]: '@' + socialMetaGetters.DEFAULT_TWITTER_CREATOR
        };
        before(() => {
          cy.intercept(
            { method: 'GET', pathname: getEndpoint(LIVE_PAGE_DETAIL) },
            { fixture: 'pages/live-page-1', statusCode: 200 }
          ).as('getPage');
          cy.intercept('/api/v1/organizations/stripe_account_id/**', { fixture: 'stripe/org-account-id.json' }).as(
            'getOrgId'
          );

          cy.visit(getTestingDonationPageUrl('my-page'));
          cy.url().should('include', 'my-page');
          cy.wait(['@getPage', '@getOrgId']);
        });

        expectedMetaTags.forEach((metaTagName) => {
          it(`document head should contain metatag with default value for ${metaTagName}`, () => {
            cy.get(`meta[name="${metaTagName}"]`).should('exist');
            cy.get(`meta[name="${metaTagName}"]`).should(
              'have.attr',
              'content',
              metaTagNameDefaultValueMap[metaTagName]
            );
          });
        });
      });

      describe('Meta tags exist with revenue program values', () => {
        const body = { ...livePageOne };
        const rpName = body.revenue_program.name;
        body.revenue_program.social_title = 'My social title';
        body.revenue_program.social_description = 'My social description';
        body.revenue_program.social_url = 'http://www.google.com';
        body.revenue_program.social_card = '/media/my-social-card.png';
        body.revenue_program.twitter_handle = 'myprogram';

        const metaTagNameRPValueMap = {
          [OG_URL]: body.revenue_program.social_url,
          [OG_TITLE]: body.revenue_program.social_title,
          [OG_DESC]: body.revenue_program.social_description,
          [OG_TYPE]: 'website',
          [OG_IMAGE]: body.revenue_program.social_card,
          [OG_IMAGE_ALT]: socialMetaGetters.getOgImgAlt(rpName),
          [TW_CARD]: socialMetaGetters.TWITTER_CARD_TYPE,
          [TW_SITE]: '@' + body.revenue_program.twitter_handle,
          [TW_CREATOR]: '@' + body.revenue_program.twitter_handle
        };

        before(() => {
          cy.intercept({ method: 'GET', pathname: getEndpoint(LIVE_PAGE_DETAIL) }, { body, statusCode: 200 }).as(
            'getPage'
          );
          cy.intercept('/api/v1/organizations/stripe_account_id/**', { fixture: 'stripe/org-account-id.json' }).as(
            'getOrgId'
          );

          cy.visit(getTestingDonationPageUrl('my-page'));
          cy.url().should('include', 'my-page');
          cy.wait(['@getPage', '@getOrgId']);
        });

        expectedMetaTags.forEach((metaTagName) => {
          it(`document head should contain metatag with revenue program value for ${metaTagName}`, () => {
            cy.get(`meta[name="${metaTagName}"]`).should('exist');
            cy.get(`meta[name="${metaTagName}"]`).should('have.attr', 'content', metaTagNameRPValueMap[metaTagName]);
          });
        });
      });
    });

    describe('Donation page side effects', () => {
      it('should pass salesforce campaign id from query parameter to request body', () => {
        const sfCampaignId = 'my-test-sf-campaign-id';
        cy.intercept(
          { method: 'GET', pathname: `${getEndpoint(LIVE_PAGE_DETAIL)}**` },
          { fixture: 'pages/live-page-1', statusCode: 200 }
        ).as('getPageDetail');
        cy.visit(getTestingDonationPageUrl(expectedPageSlug, `?campaign=${sfCampaignId}`));
        cy.url().should('include', EXPECTED_RP_SLUG);
        cy.url().should('include', expectedPageSlug);
        cy.url().should('include', sfCampaignId);

        describe('Donation page amount and frequency query parameters', () => {
          specify('&frequency and &amount uses that frequency and that amount', () => {
            // intercept page, return particular elements
            const page = livePageOne;
            const amounts = livePageOne.elements.find((el) => el.type === 'DAmount');
            const targetFreq = 'monthly';
            const targetAmount = amounts.content.options.month[1];
            cy.intercept({ method: 'GET', pathname: `${getEndpoint(LIVE_PAGE_DETAIL)}**` }, { body: page }).as(
              'getPageDetail'
            );

            // visit url + querystring
            cy.visit(`/revenue-program-slug/page-slug?amount=${targetAmount}&frequency=${targetFreq}`);
            cy.wait('@getPageDetail');

            const interval = 'One time';
            const amount = '120';
            cy.intercept(
              { method: 'POST', pathname: getEndpoint(STRIPE_PAYMENT) },
              { fixture: 'stripe/payment-intent', statusCode: 200 }
            ).as('stripePayment');
            cy.setUpDonation(interval, amount);
            cy.makeDonation();
            cy.wait('@stripePayment').then(({ request }) => {
              expect(request.body).to.have.property('sf_campaign_id');
              expect(request.body.sf_campaign_id).to.equal(sfCampaignId);
            });
          });

          describe('Donation page amount and frequency query parameters', () => {
            specify('&frequency and &amount uses that frequency and that amount', () => {
              // intercept page, return particular elements
              const page = livePageOne;
              const amounts = livePageOne.elements.find((el) => el.type === 'DAmount');
              const targetFreq = 'monthly';
              const targetAmount = amounts.content.options.month[1];
              cy.intercept({ method: 'GET', pathname: `${getEndpoint(LIVE_PAGE_DETAIL)}**` }, { body: page }).as(
                'getPageDetail'
              );

              // visit url + querystring
              cy.visit(getTestingDonationPageUrl(expectedPageSlug, `?amount=${targetAmount}&frequency=${targetFreq}`));
              cy.wait('@getPageDetail');
              cy.url().should('include', EXPECTED_RP_SLUG);
              cy.url().should('include', expectedPageSlug);
              cy.url().should('include', targetFreq);
              cy.url().should('include', targetAmount);

              // assert that the right things are checked
              cy.getByTestId('frequency-month-selected').should('exist');
              cy.getByTestId(`amount-${targetAmount}-selected`).should('exist');
            });

            specify('&frequency and @amount custom shows only that amount for frequency', () => {
              // intercept page, return particular elements
              const page = livePageOne;
              const targetFreq = 'monthly';
              const targetAmount = 99;
              cy.intercept({ method: 'GET', pathname: `${getEndpoint(LIVE_PAGE_DETAIL)}**` }, { body: page }).as(
                'getPageDetail'
              );

              // visit url + querystring
              cy.visit(getTestingDonationPageUrl(expectedPageSlug, `?amount=${targetAmount}&frequency=${targetFreq}`));
              cy.wait('@getPageDetail');
              cy.url().should('include', EXPECTED_RP_SLUG);
              cy.url().should('include', expectedPageSlug);
              cy.url().should('include', targetFreq);
              cy.url().should('include', targetAmount);

              // assert that the right things are checked
              cy.getByTestId('frequency-month-selected').should('exist');
              cy.getByTestId(`amount-other-selected`).within(() => {
                cy.get('input').should('have.value', targetAmount);
              });
            });

            specify('&amount but no &frequency defaults to that amount with the frequency=once', () => {
              // intercept page, return particular elements
              const page = livePageOne;
              const targetAmount = 99;
              const amounts = livePageOne.elements.find((el) => el.type === 'DAmount');
              cy.intercept({ method: 'GET', pathname: `${getEndpoint(LIVE_PAGE_DETAIL)}**` }, { body: page }).as(
                'getPageDetail'
              );
              // visit url + querystring
              cy.visit(getTestingDonationPageUrl(expectedPageSlug, `?amount=${targetAmount}`));
              cy.wait('@getPageDetail');
              cy.url().should('include', EXPECTED_RP_SLUG);
              cy.url().should('include', expectedPageSlug);
              cy.url().should('include', targetAmount);

              // assert that the right things are checked
              cy.getByTestId('frequency-one_time-selected').should('exist');
              cy.getByTestId(`amount-other-selected`).within(() => {
                cy.get('input').should('have.value', targetAmount);
              });
              amounts.content.options.one_time.forEach((amount) => {
                cy.getByTestId(`amount-${amount}`).should('not.exist');
              });
            });

            specify('&frequency=once but no amount defaults to the one-time default set by the page creator', () => {
              // intercept page, return particular elements
              const page = livePageOne;
              const targetFreq = 'once';
              cy.intercept({ method: 'GET', pathname: `${getEndpoint(LIVE_PAGE_DETAIL)}**` }, { body: page }).as(
                'getPageDetail'
              );

              // visit url + querystring
              cy.visit(getTestingDonationPageUrl(expectedPageSlug, `?frequency=${targetFreq}`));
              cy.wait('@getPageDetail');
              cy.url().should('include', EXPECTED_RP_SLUG);
              cy.url().should('include', expectedPageSlug);
              cy.url().should('include', targetFreq);

              // assert that the right things are checked
              cy.getByTestId('frequency-one_time-selected').should('exist');
            });

            specify('&frequency=yearly but no amount defaults to the yearly default set by the page creator', () => {
              // intercept page, return particular elements
              const page = livePageOne;
              const targetFreq = 'yearly';
              cy.intercept({ method: 'GET', pathname: `${getEndpoint(LIVE_PAGE_DETAIL)}**` }, { body: page }).as(
                'getPageDetail'
              );

              // visit url + querystring
              cy.visit(getTestingDonationPageUrl(expectedPageSlug, `?frequency=${targetFreq}`));
              cy.wait('@getPageDetail');
              cy.url().should('include', EXPECTED_RP_SLUG);
              cy.url().should('include', expectedPageSlug);
              cy.url().should('include', targetFreq);

              // assert that the right things are checked
              cy.getByTestId('frequency-year-selected').should('exist');
            });

            specify('&frequency=monthly but no amount defaults to the monthly default set by the page creator', () => {
              // intercept page, return particular elements
              const page = livePageOne;
              const targetFreq = 'monthly';
              cy.intercept({ method: 'GET', pathname: `${getEndpoint(LIVE_PAGE_DETAIL)}**` }, { body: page }).as(
                'getPageDetail'
              );

              // visit url + querystring
              cy.visit(getTestingDonationPageUrl(expectedPageSlug, `?frequency=${targetFreq}`));
              cy.wait('@getPageDetail');
              cy.url().should('include', EXPECTED_RP_SLUG);
              cy.url().should('include', expectedPageSlug);
              cy.url().should('include', targetFreq);

              // assert that the right things are checked
              cy.getByTestId('frequency-month-selected').should('exist');
            });
          });
        });
      });
    });

    describe('404 behavior', () => {
      it('should show 404 if request live page returns non-200', () => {
        cy.intercept(
          { method: 'GET', pathname: getEndpoint(LIVE_PAGE_DETAIL) },
          { fixture: 'pages/live-page-1', statusCode: 404 }
        ).as('getLivePage');
        cy.visit(getTestingDonationPageUrl(expectedPageSlug));
        cy.url().should('include', EXPECTED_RP_SLUG);
        cy.url().should('include', expectedPageSlug);
        cy.wait('@getLivePage');
        cy.getByTestId('live-page-404').should('exist');
      });

      it('should show 404 if request stripe account id returns non-200', () => {
        cy.intercept(
          { method: 'GET', pathname: getEndpoint(LIVE_PAGE_DETAIL) },
          { fixture: 'pages/live-page-1', statusCode: 200 }
        );
        cy.visit(getTestingDonationPageUrl(expectedPageSlug));
        cy.url().should('include', EXPECTED_RP_SLUG);
        cy.url().should('include', expectedPageSlug);
        cy.wait('@getStripeAccountId');
        cy.getByTestId('live-page-404').should('exist');
      });

      it('should not show 404 otherwise', () => {
        cy.intercept(
          { method: 'GET', pathname: getEndpoint(LIVE_PAGE_DETAIL) },
          { fixture: 'pages/live-page-1', statusCode: 200 }
        ).as('getLivePage');
        cy.visit(getTestingDonationPageUrl(expectedPageSlug));
        cy.url().should('include', EXPECTED_RP_SLUG);
        cy.url().should('include', expectedPageSlug);
        cy.wait('@getLivePage');
        cy.wait('@getStripeAccountId');
        cy.getByTestId('live-page-404').should('not.exist');
        cy.getByTestId('donation-page').should('exist');
      });

      it('should contain clearbit.js script in body', () => {
        cy.get('head').find(`script[src*="${CLEARBIT_SCRIPT_SRC}"]`).should('have.length', 1);
      });
    });

    describe('Footer-like content', () => {
      before(() => {
        cy.intercept(
          { method: 'GET', pathname: getEndpoint(LIVE_PAGE_DETAIL) },
          { fixture: 'pages/live-page-1', statusCode: 200 }
        ).as('getPage');
        cy.intercept('/api/v1/organizations/stripe_account_id/**', { fixture: 'stripe/org-account-id.json' }).as(
          'getStripeAccountId'
        );
        cy.visit(getTestingDonationPageUrl(expectedPageSlug));
        cy.url().should('include', EXPECTED_RP_SLUG);
        cy.url().should('include', expectedPageSlug);
        cy.wait('@getPage');
        cy.wait('@getStripeAccountId');
      });

      it('should render page footer with link to fundjournalism.org', () => {
        cy.getByTestId('donation-page-footer').should('exist');
        cy.getByTestId('donation-page-footer')
          .contains('fundjournalism.org')
          .should('have.attr', 'href', 'https://fundjournalism.org/');
      });

      it('should render correct copyright info, including revenue program name', () => {
        cy.getByTestId('donation-page-footer').contains(
          new Date().getFullYear() + ' ' + livePageOne.revenue_program.name
        );
      });

      it('should render organization contact email if present, nothing if not', () => {
        const expectedString = `Contact us at ${livePageOne.revenue_program.contact_email}`;
        // If revenue_program.contact_email is present, should show...
        cy.getByTestId('donation-page-static-text').contains(expectedString).should('exist');

        // ...but if we remove it, shouldn't show
        const page = { ...livePageOne };
        page.revenue_program.contact_email = '';
        cy.intercept({ method: 'GET', pathname: getEndpoint(LIVE_PAGE_DETAIL) }, { body: page, statusCode: 200 });
        cy.visit(getTestingDonationPageUrl('page-slug-2'));
        cy.getByTestId('donation-page-static-text').contains(expectedString).should('not.exist');
      });

      it('should render revenue program address if present, nothing if not', () => {
        const expectedString = `Prefer to mail a check? Our mailing address is ${livePageOne.revenue_program.address}.`;
        // If revenue_program.address is present, should show...
        cy.getByTestId('donation-page-static-text').contains(expectedString).should('exist');

        // ...but if we remove it, shouldn't show
        const page = { ...livePageOne };
        page.revenue_program.address = '';
        cy.intercept({ method: 'GET', pathname: getEndpoint(LIVE_PAGE_DETAIL) }, { body: page, statusCode: 200 });
        cy.visit(getTestingDonationPageUrl('page-slug'));
        cy.getByTestId('donation-page-static-text').contains(expectedString).should('not.exist');
      });

      it('should render certain text if the org is nonprofit', () => {
        const nonProfitPage = { ...livePageOne };
        // ensure contact_email, so text section shows up at all
        nonProfitPage.revenue_program.contact_email = 'testing@test.com';
        nonProfitPage.organization_is_nonprofit = true;
        cy.intercept(
          { method: 'GET', pathname: getEndpoint(LIVE_PAGE_DETAIL) },
          { body: nonProfitPage, statusCode: 200 }
        ).as('getNonProfitPage');
        cy.visit(getTestingDonationPageUrl('page-slug-6'));
        cy.url().should('include', 'page-slug-6');
        cy.wait('@getNonProfitPage');
        // If org is non-profit, show certain text...
        cy.getByTestId('donation-page-static-text').contains('are tax deductible').should('exist');
        cy.getByTestId('donation-page-static-text').contains('change a recurring donation').should('exist');
      });

      it('should render different text if the org is for-profit', () => {
        const forProfitPage = { ...livePageOne };
        forProfitPage.organization_is_nonprofit = false;
        cy.intercept(
          { method: 'GET', pathname: getEndpoint(LIVE_PAGE_DETAIL) },
          { body: forProfitPage, statusCode: 200 }
        ).as('getForProfitPage');
        cy.visit(getTestingDonationPageUrl('page-slug-2'));
        cy.url().should('include', 'page-slug-2');
        cy.wait('@getForProfitPage');
        cy.getByTestId('donation-page-static-text').contains('are not tax deductible').should('exist');
        cy.getByTestId('donation-page-static-text').contains('change a recurring contribution').should('exist');
      });

      it('should show different content based on the selected amount and frequency', () => {
        cy.intercept(
          { method: 'GET', pathname: getEndpoint(LIVE_PAGE_DETAIL) },
          { fixture: 'pages/live-page-1', statusCode: 200 }
        ).as('getPage');
        cy.visit(getTestingDonationPageUrl(expectedPageSlug));
        cy.url().should('include', EXPECTED_RP_SLUG);
        cy.url().should('include', expectedPageSlug);
        cy.wait('@getPage');

        const targetMonthlyAmount = 15;
        // if frequency is monthly, show particular agreement statement...
        cy.getByTestId('frequency-month').click();
        cy.getByTestId(`amount-${targetMonthlyAmount}`).click();
        const expectedMonthlyText = `payments of $${targetMonthlyAmount}, to be processed on or adjacent to the ${new Date().getDate()}`;
        cy.getByTestId('donation-page-static-text').contains(expectedMonthlyText).should('exist');

        // if frequency is yearly, show another agreement statement...
        const targetYearlyAmount = 365;
        cy.getByTestId('frequency-year').click();
        cy.getByTestId(`amount-${targetYearlyAmount}`).click();
        const expectedYearlyText = `payments of $${targetYearlyAmount}, to be processed on or adjacent to ${format(
          new Date(),
          'L/d'
        )} yearly until you cancel`;
        cy.getByTestId('donation-page-static-text').contains(expectedYearlyText).should('exist');

        // ... but if it's one-time, don't
        cy.getByTestId('frequency-one_time').click();
        cy.getByTestId('donation-page-static-text').contains(expectedMonthlyText).should('not.exist');
        cy.getByTestId('donation-page-static-text').contains(expectedYearlyText).should('not.exist');
      });
    });

    describe('Thank you page', () => {
      it('should show a generic Thank You page at /page-slug/thank-you', () => {
        cy.intercept(
          { method: 'GET', pathname: getEndpoint(LIVE_PAGE_DETAIL) },
          { fixture: 'pages/live-page-1', statusCode: 200 }
        );
        cy.visit(getTestingDonationPageUrl('page-slug/thank-you'));
        cy.getByTestId('generic-thank-you').should('exist');
      });
    });
  });
});
