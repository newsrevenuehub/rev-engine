import { loadStripe } from '@stripe/stripe-js';
import { render, screen, waitFor } from 'test-utils';
import StripePaymentWrapper, { StripePaymentWrapperProps } from './StripePaymentWrapper';

jest.mock('@stripe/stripe-js');
jest.mock('@stripe/react-stripe-js', () => ({
  Elements: (props: any) => (
    <div
      data-testid="mock-stripe-elements"
      data-stripe={JSON.stringify(props.stripe)}
      data-options={JSON.stringify(props.options)}
    >
      {props.children}
    </div>
  )
}));
jest.mock('appSettings', () => ({ HUB_STRIPE_API_PUB_KEY: 'mock-hub-stripe-key' }));
jest.mock('elements/GlobalLoading');

function tree(props?: Partial<StripePaymentWrapperProps>) {
  return render(
    <StripePaymentWrapper
      onError={jest.fn()}
      stripeAccountId="mock-stripe-account-id"
      stripeClientSecret="mock-stripe-client-secret"
      stripeLocale={'mock-stripe-locale' as any}
      {...props}
    >
      children
    </StripePaymentWrapper>
  );
}

describe('StripePaymentWrapper', () => {
  const loadStripeMock = jest.mocked(loadStripe);

  describe('On first render', () => {
    it("loads Stripe with the Hub public key and page's Stripe account ID", () => {
      tree();
      expect(loadStripeMock.mock.calls).toEqual([['mock-hub-stripe-key', { stripeAccount: 'mock-stripe-account-id' }]]);
    });

    it('shows a spinner', () => {
      tree();
      expect(screen.getByTestId('mock-global-loading')).toBeInTheDocument();
    });
  });

  describe('When Stripe loads', () => {
    beforeEach(() => {
      loadStripeMock.mockReturnValue('mock-stripe-loaded' as any);
    });

    it("doesn't show a loading spinner", async () => {
      tree();
      await waitFor(() => expect(loadStripeMock).toBeCalled());
      expect(screen.queryByTestId('mock-global-loading')).not.toBeInTheDocument();
    });

    it('shows a configured Stripe <Elements> component with client secret if set', async () => {
      tree();
      await waitFor(() => expect(loadStripeMock).toBeCalled());

      const elements = screen.getByTestId('mock-stripe-elements');

      expect(elements).toBeInTheDocument();
      expect(JSON.parse(elements.dataset.options!)).toEqual({
        clientSecret: 'mock-stripe-client-secret',
        locale: 'mock-stripe-locale'
      });
      await waitFor(() => expect(elements.dataset.stripe).not.toEqual('undefined'));
      expect(elements.dataset.stripe).toEqual('"mock-stripe-loaded"');
    });

    it('shows a configured Stripe <Elements> component without client secret if not set', async () => {
      tree({ stripeClientSecret: undefined });
      await waitFor(() => expect(loadStripeMock).toBeCalled());

      const elements = screen.getByTestId('mock-stripe-elements');

      expect(elements).toBeInTheDocument();
      expect(JSON.parse(elements.dataset.options!)).toEqual({
        clientSecret: undefined,
        locale: 'mock-stripe-locale'
      });
      await waitFor(() => expect(elements.dataset.stripe).not.toEqual('undefined'));
      expect(elements.dataset.stripe).toEqual('"mock-stripe-loaded"');
    });

    it('shows children', async () => {
      tree();
      await waitFor(() => expect(loadStripeMock).toBeCalled());
      expect(screen.getByText('children')).toBeVisible();
    });
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

    it('shows a spinner', async () => {
      tree();
      await waitFor(() => expect(loadStripeMock).toBeCalled());
    });
  });
});
