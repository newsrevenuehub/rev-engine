import { getPaymentSuccessUrl } from './stripeFns';
import { PAYMENT_SUCCESS } from 'routes';

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
  stripeClientSecret: 'shhhhh'
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
  stripeClientSecret: 'shhhhh'
};

describe('getPaymentSuccessUrl function', () => {
  it.each([
    [fromPageSlugParams, ''],
    [fromDefaultPageParams, '']
  ])('generates the expected payment success URL,', (args, expectedUrl) => {
    const url = getPaymentSuccessUrl(...Object.values(args));
    const parsed = new URL(url);
    expect(`${parsed.protocol}//${parsed.hostname}`).toEqual(args.baseUrl);
    expect(parsed.pathname).toEqual(PAYMENT_SUCCESS);
    const search = new URLSearchParams(parsed.search);
    expect(search.get('next')).toEqual(args['thankYouRedirectUrl']);
    expect(search.get('amount')).toEqual(args['amount']);
    expect(search.get('frequency')).toEqual(args['frequencyDisplayValue']);
    expect(search.get('uid')).toEqual(args.emailHash);
    expect(search.get('email')).toEqual(args.contributorEmail);
    expect(search.get('pageSlug')).toEqual(args.pageSlug);
    expect(search.get('rpSlug')).toEqual(args.rpSlug);
    expect(search.get('fromPath')).toEqual(args.pathName === '/' ? '' : args.pathName);
    expect(search.get('payment_intent_client_secret')).toEqual(args.stripeClientSecret);
  });
});
