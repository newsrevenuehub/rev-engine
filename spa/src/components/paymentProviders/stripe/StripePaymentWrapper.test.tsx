import { loadStripe } from '@stripe/stripe-js';
import { DonationPage, DonationPageContext } from 'components/donationPage/DonationPage';
import { render, screen, waitFor } from 'test-utils';
import StripePaymentWrapper, { StripePaymentWrapperProps } from './StripePaymentWrapper';

jest.mock('@stripe/stripe-js');
jest.mock('@stripe/react-stripe-js', () => ({
  Elements: (props: any) => (
    <div
      data-testid="mock-stripe-elements"
      data-stripe={JSON.stringify(props.stripe)}
      data-options={JSON.stringify(props.options)}
    />
  )
}));
jest.mock('appSettings', () => ({ HUB_STRIPE_API_PUB_KEY: 'mock-hub-stripe-key' }));
jest.mock('elements/GlobalLoading');

function tree(props?: Partial<StripePaymentWrapperProps>, context?: Partial<DonationPage>) {
  return render(
    <DonationPageContext.Provider
      value={
        {
          feeAmount: 0,
          frequency: 'one_time',
          page: {
            payment_provider: {
              stripe_account_id: 'mock-stripe-account-id'
            },
            revenue_program: {
              name: 'mock-rp-name'
            }
          },
          revenue_program: {
            name: 'mock-rp-name'
          },
          elements: [],
          setAmount: () => {},
          overrideAmount: false,
          errors: {},
          stripeClientSecret: 'mock-stripe-client-secret',
          userAgreesToPayFees: false,
          setUserAgreesToPayFees: jest.fn(),
          ...context
        } as any
      }
    >
      <StripePaymentWrapper {...props} />
    </DonationPageContext.Provider>
  );
}

describe('StripePaymentWrapper', () => {
  const loadStripeMock = loadStripe as jest.Mock;

  describe("When a Stripe client secret and account ID aren't available in context", () => {
    it('shows a loading spinner', () => {
      tree(undefined, { page: { payment_provider: {} }, stripeClientSecret: undefined } as any);
      expect(screen.getByTestId('mock-global-loading')).toBeInTheDocument();
    });

    it("doesn't load Stripe", async () => {
      tree(undefined, { page: { payment_provider: {} }, stripeClientSecret: undefined } as any);
      await Promise.resolve(); // let any async actions resolve
      expect(loadStripeMock).not.toBeCalled();
    });
  });

  describe('When a Stripe client secret is available in context', () => {
    it("loads Stripe with the Hub public key and page's Stripe account ID", () => {
      tree();
      expect(loadStripeMock.mock.calls).toEqual([['mock-hub-stripe-key', { stripeAccount: 'mock-stripe-account-id' }]]);
    });

    it("doesn't show a loading spinner", () => {
      tree();
      expect(screen.queryByTestId('mock-global-loading')).not.toBeInTheDocument();
    });

    it('shows a configured Stripe <Elements> component', async () => {
      loadStripeMock.mockResolvedValue('mock-stripe-loaded');
      tree();

      const elements = screen.getByTestId('mock-stripe-elements');

      expect(elements).toBeInTheDocument();
      expect(JSON.parse(elements.dataset.options!)).toEqual({ clientSecret: 'mock-stripe-client-secret' });
      await waitFor(() => expect(elements.dataset.stripe).not.toEqual('undefined'));
      expect(elements.dataset.stripe).toEqual('"mock-stripe-loaded"');
    });

    describe('When loading Stripe fails', () => {
      const error = new Error();
      let warnSpy: jest.SpyInstance;

      beforeEach(() => {
        loadStripeMock.mockRejectedValue(error);
        warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      });

      afterEach(() => warnSpy.mockRestore());

      it('logs a warning to the console', async () => {
        tree();
        await waitFor(() => expect(warnSpy).toBeCalled());
        expect(warnSpy.mock.calls).toEqual([[error]]);
      });

      it("calls the onError prop if it's defined", async () => {
        const onError = jest.fn();

        tree({ onError });
        await waitFor(() => expect(onError).toBeCalled());
        expect(onError.mock.calls).toEqual([[error]]);
      });
    });
  });
});
