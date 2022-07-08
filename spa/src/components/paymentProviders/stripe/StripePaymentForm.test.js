import { render } from 'test-utils';

import { getDisabledWallets } from './StripePaymentForm';

describe('Page does not allow google as stripe-payment-option', () => {
  let result;
  beforeEach(async () => {
    const page = {
      elements: [{ type: 'DPayment', content: { stripe: ['card', 'browser', 'apple'], offerPayFees: true } }]
    };
    result = await getDisabledWallets(page);
  });

  it('should disable googlePay', () => {
    expect(result[0]).toEqual('googlePay');
  });
});

describe('Page does not allow apple as stripe-payment-option', () => {
  let result;
  beforeEach(async () => {
    const page = {
      elements: [{ type: 'DPayment', content: { stripe: ['card', 'browser', 'google'], offerPayFees: true } }]
    };
    result = await getDisabledWallets(page);
  });

  it('should disable applePay', () => {
    expect(result[0]).toEqual('applePay');
  });
});

describe('Page does not allow google,apple,browser as stripe-payment-options', () => {
  let result;
  beforeEach(async () => {
    const page = { elements: [{ type: 'DPayment', content: { stripe: [], offerPayFees: true } }] };
    result = await getDisabledWallets(page);
  });

  it('should disable all of googlePay,applePay,browserCard', () => {
    expect(result).toContain('googlePay');
    expect(result).toContain('applePay');
    expect(result).toContain('browserCard');
  });
});

describe('Page allows all of google,apple,browser as stripe-payment-options', () => {
  let result;
  beforeEach(async () => {
    const page = {
      elements: [{ type: 'DPayment', content: { stripe: ['card', 'browser', 'apple', 'google'], offerPayFees: true } }]
    };
    result = await getDisabledWallets(page);
  });

  it('should return empty array', () => {
    expect(result.length).toEqual(0);
  });
});
