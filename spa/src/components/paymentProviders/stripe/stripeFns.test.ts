import {
  ContributionFormExtraData,
  createPaymentMethod,
  getPaymentSuccessUrl,
  getTotalAmount,
  serializeData,
  getPaymentElementButtonText
} from './stripeFns';
import { PAYMENT_SUCCESS } from 'routes';
import { CONTRIBUTION_INTERVALS } from 'constants/contributionIntervals';

jest.mock('utilities/calculateStripeFee', () => () => 9000.99);

const fromPageSlugParams = {
  baseUrl: 'https://my-rp.localhost',
  thankYouRedirectUrl: 'https://www.google.com',
  amount: '123.01',
  emailHash: 'someEmailHash3737',
  frequencyDisplayValue: 'month',
  contributorEmail: 'foo@bar.com',
  pageSlug: 'my-page',
  rpSlug: 'my-rp',
  pathName: '/my-page',
  contributionUuid: 'secret-secret'
};

const fromDefaultPageParams = {
  baseUrl: 'https://my-rp.localhost',
  thankYouRedirectUrl: 'https://www.google.com',
  amount: '123.01',
  emailHash: 'someEmailHash3737',
  frequencyDisplayValue: 'month',
  contributorEmail: 'foo@bar.com',
  pageSlug: 'my-page',
  rpSlug: 'my-rp',
  pathName: '/',
  contributionUuid: 'secret-secret'
};

describe('getTotalAmount', () => {
  it('adds a Stripe fee if the user has agreed to pay fees', () =>
    expect(getTotalAmount(100, true, 'one_time', true)).toBe('9100.99'));

  it("doesn't add a Stripe fee if the user has agreed to pay fees", () =>
    expect(getTotalAmount(100, false, 'one_time', true)).toBe('100'));

  it('rounds the result to two decimal places', () => {
    expect(getTotalAmount(1.234, false, 'one_time', true)).toBe('1.23');
    expect(getTotalAmount(1.2345, false, 'one_time', true)).toBe('1.23');
    expect(getTotalAmount(1.2349, false, 'one_time', true)).toBe('1.23');
    expect(getTotalAmount(1.235, false, 'one_time', true)).toBe('1.24');
  });

  it('removes decimal places if the total is a round number', () => {
    expect(getTotalAmount(1.0, false, 'one_time', true)).toBe('1');
    expect(getTotalAmount(10.0, false, 'one_time', true)).toBe('10');
    expect(getTotalAmount(1234.0, false, 'one_time', true)).toBe('1234');
  });
});

describe('createPaymentMethod', () => {
  it('creates a payment method with the card passed using the Stripe API', () => {
    const mockCard = {};
    const mockStripe = { createPaymentMethod: jest.fn() };

    createPaymentMethod(mockStripe as any, mockCard as any);
    expect(mockStripe.createPaymentMethod.mock.calls).toEqual([
      [{ billing_details: {}, card: mockCard, type: 'card' }]
    ]);
  });

  it('adds name to the billing details from the form if specified', () => {
    const mockStripe = { createPaymentMethod: jest.fn() };

    createPaymentMethod(mockStripe as any, {} as any, { first_name: 'Jane', last_name: 'Doe' });
    expect(mockStripe.createPaymentMethod.mock.calls).toEqual([
      [
        expect.objectContaining({
          billing_details: {
            name: 'Jane Doe'
          }
        })
      ]
    ]);
  });

  it('does not put a name in billing details if not specified', () => {
    const mockStripe = { createPaymentMethod: jest.fn() };

    createPaymentMethod(mockStripe as any, {} as any, {});
    expect(mockStripe.createPaymentMethod.mock.calls).toEqual([
      [
        expect.objectContaining({
          billing_details: {}
        })
      ]
    ]);
  });

  it('uses the first name only in billing details if that was specified', () => {
    const mockStripe = { createPaymentMethod: jest.fn() };

    createPaymentMethod(mockStripe as any, {} as any, { first_name: 'Jane' });
    expect(mockStripe.createPaymentMethod.mock.calls).toEqual([
      [
        expect.objectContaining({
          billing_details: {
            name: 'Jane'
          }
        })
      ]
    ]);
  });

  it('uses the last name only in billing details if that was specified', () => {
    const mockStripe = { createPaymentMethod: jest.fn() };

    createPaymentMethod(mockStripe as any, {} as any, { last_name: 'Doe' });
    expect(mockStripe.createPaymentMethod.mock.calls).toEqual([
      [
        expect.objectContaining({
          billing_details: {
            name: 'Doe'
          }
        })
      ]
    ]);
  });

  it('returns the promise that the Stripe API returns', async () => {
    const mockStripe = { createPaymentMethod: jest.fn(() => Promise.resolve({ pass: true })) };

    expect(await createPaymentMethod(mockStripe as any, {} as any)).toEqual({ pass: true });
  });
});

describe('getPaymentSuccessUrl', () => {
  it.each([[fromPageSlugParams], [fromDefaultPageParams]])('generates the expected payment success URL', (args) => {
    const url = getPaymentSuccessUrl(args);
    const parsed = new URL(url);

    expect(`${parsed.protocol}//${parsed.hostname}`).toEqual(args.baseUrl);
    expect(parsed.pathname).toEqual(PAYMENT_SUCCESS);

    const search = new URLSearchParams(parsed.search);

    expect(search.get('next')).toBe(args['thankYouRedirectUrl']);
    expect(search.get('amount')).toBe(args['amount']);
    expect(search.get('frequency')).toBe(args['frequencyDisplayValue']);
    expect(search.get('uid')).toBe(args.emailHash);
    expect(search.get('email')).toBe(args.contributorEmail);
    expect(search.get('pageSlug')).toBe(args.pageSlug);
    expect(search.get('rpSlug')).toBe(args.rpSlug);
    expect(search.get('fromPath')).toBe(args.pathName === '/' ? '' : args.pathName);
  });
  // this test is here syntax in original implementation was flawed and caused `amount: 1` to
  // raise the missing args error.
  it('accepts an amount of 1', () => {
    getPaymentSuccessUrl({ ...fromDefaultPageParams, amount: 1 } as any);
  });

  it('throws if a necessary param is missing', () =>
    expect(() => getPaymentSuccessUrl({ ...fromDefaultPageParams, baseUrl: undefined } as any)).toThrow());
});

describe('serializeData', () => {
  let mockForm: HTMLFormElement;
  let mockElement: HTMLInputElement;
  const mockState: ContributionFormExtraData = {
    amount: 'mock-amount',
    currency: 'mock-currency',
    frequency: 'month',
    mailingCountry: 'mock-mailing-country',
    pageId: 'mock-page-id',
    pageSlug: 'mock-page-slug',
    payFee: false,
    reCAPTCHAToken: 'mock-captcha',
    turnstileCAPTCHA: 'mock-turnstile',
    revProgramSlug: 'mock-rp-slug',
    rpCountry: 'mock-rp-country',
    rpIsNonProfit: false
  };

  beforeEach(() => {
    mockForm = document.createElement('form');
    mockElement = document.createElement('input');
    mockForm.appendChild(mockElement);
  });

  it.each([['swag_opt_out'], ['tribute_type_honoree'], ['tribute_type_in_memory_of']])(
    'converts the %s form field to actual booleans',
    (fieldName) => {
      mockElement.setAttribute('name', fieldName);
      mockElement.setAttribute('value', 'true');
      expect(serializeData(mockForm, {} as any)).toEqual(expect.objectContaining({ [fieldName]: true }));
      mockElement.setAttribute('value', 'false');
      expect(serializeData(mockForm, {} as any)).toEqual(expect.objectContaining({ [fieldName]: true }));
      mockForm.removeChild(mockElement);

      // Need some special handling for the undefined scenario.

      const result = expect(serializeData(mockForm, {} as any));

      expect(result[fieldName]).toBeUndefined();
    }
  );

  it('passes through string form fields as-is', () => {
    mockElement.setAttribute('name', 'mockName');
    mockElement.setAttribute('value', 'foo');
    mockForm.appendChild(mockElement);
    expect(serializeData(mockForm, {} as any)).toEqual(expect.objectContaining({ mockName: 'foo' }));
  });

  it('sets agreed_to_pay_fees based on the state provided', () => {
    expect(serializeData(mockForm, { ...mockState, payFee: true })).toEqual(
      expect.objectContaining({ agreed_to_pay_fees: true })
    );
    expect(serializeData(mockForm, { ...mockState, payFee: false })).toEqual(
      expect.objectContaining({ agreed_to_pay_fees: false })
    );
  });

  it('sets amount to the total amount, including fees if the user selected that', () => {
    // Note mock at the top of this suite.

    expect(serializeData(mockForm, { ...mockState, amount: '123', payFee: true })).toEqual(
      expect.objectContaining({
        amount: '9123.99'
      })
    );
    expect(serializeData(mockForm, { ...mockState, amount: '123', payFee: false })).toEqual(
      expect.objectContaining({
        amount: '123'
      })
    );
  });

  it('sets donor_selected_amount to the amount before fees', () => {
    // Paying fees should never change this number.

    for (const payFee of [true, false]) {
      expect(serializeData(mockForm, { ...mockState, payFee, amount: '123' })).toEqual(
        expect.objectContaining({
          donor_selected_amount: '123'
        })
      );
    }
  });

  it('sets mailing_country based on the state provided', () =>
    expect(serializeData(mockForm, { ...mockState, mailingCountry: 'test-country' })).toEqual(
      expect.objectContaining({ mailing_country: 'test-country' })
    ));

  it('sets revenue_program_slug based on the state provided', () =>
    expect(serializeData(mockForm, { ...mockState, revProgramSlug: 'test-slug' })).toEqual(
      expect.objectContaining({ revenue_program_slug: 'test-slug' })
    ));

  it('sets currency based on the state provided', () =>
    expect(serializeData(mockForm, { ...mockState, currency: 'test-currency' })).toEqual(
      expect.objectContaining({ currency: 'test-currency' })
    ));

  it('sets page based on the state provided', () =>
    expect(serializeData(mockForm, { ...mockState, pageId: 'test-page' })).toEqual(
      expect.objectContaining({ page: 'test-page' })
    ));

  it('sets captcha_token based on the state provided', () =>
    expect(serializeData(mockForm, { ...mockState, reCAPTCHAToken: 'test-token' })).toEqual(
      expect.objectContaining({ captcha_token: 'test-token' })
    ));

  it('sets sf_campaign_id based on the state provided', () =>
    expect(serializeData(mockForm, { ...mockState, salesforceCampaignId: 'test-id' })).toEqual(
      expect.objectContaining({ sf_campaign_id: 'test-id' })
    ));
});

describe('getPaymentElementButtonText', () => {
  it.each`
    amount | frequency                          | currencyCode | currencySymbol | expectation
    ${100} | ${CONTRIBUTION_INTERVALS.ONE_TIME} | ${'USD'}     | ${'$'}         | ${'stripeFns.paymentElementButtonText.one_time{"amount":"$100.00 USD"}'}
    ${200} | ${CONTRIBUTION_INTERVALS.ONE_TIME} | ${'USD'}     | ${'$'}         | ${'stripeFns.paymentElementButtonText.one_time{"amount":"$200.00 USD"}'}
    ${200} | ${CONTRIBUTION_INTERVALS.ONE_TIME} | ${''}        | ${'£'}         | ${'stripeFns.paymentElementButtonText.one_time{"amount":"£200.00"}'}
    ${100} | ${CONTRIBUTION_INTERVALS.ANNUAL}   | ${'CAD'}     | ${'$'}         | ${'stripeFns.paymentElementButtonText.year{"amount":"$100.00 CAD"}'}
    ${100} | ${CONTRIBUTION_INTERVALS.MONTHLY}  | ${'CAD'}     | ${'$'}         | ${'stripeFns.paymentElementButtonText.month{"amount":"$100.00 CAD"}'}
  `('produces expected result', ({ amount, frequency, currencyCode, currencySymbol, expectation }) => {
    expect(getPaymentElementButtonText({ amount, currencyCode, frequency, currencySymbol })).toBe(expectation);
  });
});
