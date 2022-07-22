import isEqual from 'lodash.isequal';
import { getDisabledWallets } from './StripePaymentForm';
describe('getDisabledWallets function', () => {
  it.each`
    pagePaymentTypes                  | expectedSet
    ${['browser', 'apple']}           | ${new Set(['googlePay'])}
    ${['browser', 'google']}          | ${new Set(['applePay'])}
    ${['apple', 'google']}            | ${new Set(['browserCard'])}
    ${[]}                             | ${new Set(['browserCard', 'applePay', 'googlePay'])}
    ${['browser', 'apple', 'google']} | ${new Set([])}
  `('returns list equivalent of $expectedSet when given $pagePaymentTypes', ({ pagePaymentTypes, expectedSet }) => {
    const page = {
      elements: [{ type: 'DPayment', content: { stripe: pagePaymentTypes, offerPayFees: true } }]
    };
    expect(isEqual(new Set(getDisabledWallets(page)), expectedSet)).toBe(true);
  });
});
