import { useElements, useStripe } from '@stripe/react-stripe-js';
import { axe } from 'jest-axe';
import { useAlert } from 'react-alert';
import { act, fireEvent, mocki18n, render, screen } from 'test-utils';
import { Payment } from 'hooks/usePayment';
import StripePaymentForm, { StripePaymentFormProps } from './StripePaymentForm';
import { getPaymentSuccessUrl } from 'components/paymentProviders/stripe/stripeFns';

jest.mock('@stripe/react-stripe-js', () => ({
  PaymentElement: ({ options }: any) => (
    <div data-testid="mock-payment-element" data-options={JSON.stringify(options)} />
  ),
  useElements: jest.fn(),
  useStripe: jest.fn()
}));
jest.mock('react-alert', () => ({
  ...jest.requireActual('react-alert'),
  useAlert: jest.fn()
}));

const mockPayment: Payment = {
  amount: '123.45',
  currency: {
    code: 'mock-currency-code',
    symbol: 'mock-currency-symbol'
  },
  emailHash: 'mock-email-hash',
  interval: 'one_time',
  pageSlug: 'mock-page-slug',
  revenueProgramSlug: 'mock-rp-slug',
  stripe: {
    accountId: 'mock-account-id',
    billingDetails: {
      email: 'mock-email'
    },
    clientSecret: 'pi_mock-client-secret'
  },
  thankYouUrl: 'mock-thank-you-url',
  uuid: 'mock-uuid'
};

function successUrl(payment: Payment) {
  return getPaymentSuccessUrl(mocki18n, {
    amount: payment.amount,
    baseUrl: window.location.origin,
    contributorEmail: payment.stripe.billingDetails.email as string,
    emailHash: payment.emailHash as string,
    frequencyDisplayValue: `common.frequency.thankYous.${payment.interval}`,
    pageSlug: payment.pageSlug,
    pathName: '',
    rpSlug: payment.revenueProgramSlug,
    thankYouRedirectUrl: payment.thankYouUrl as string
  });
}

function tree(props?: Partial<StripePaymentFormProps>) {
  return render(<StripePaymentForm payment={mockPayment} locale="en" {...props} />);
}

describe('StripePaymentForm', () => {
  const useAlertMock = jest.mocked(useAlert);
  const useElementsMock = jest.mocked(useElements);
  const useStripeMock = jest.mocked(useStripe);

  beforeEach(() => {
    useAlertMock.mockReturnValue({
      error: jest.fn()
    } as any);
    useElementsMock.mockReturnValue({} as any);
    useStripeMock.mockReturnValue({
      confirmPayment: jest.fn(() => ({})),
      confirmSetup: jest.fn(() => ({}))
    } as any);
    delete (window as any).Cypress;
    delete (window as any).stripe;
  });

  it('shows a Stripe Payment Element configured not to show billing details or legal agreement', () => {
    tree();

    const element = screen.getByTestId('mock-payment-element');

    expect(element).toBeInTheDocument();
    expect(element.dataset.options).toBe(
      JSON.stringify({ fields: { billingDetails: 'never' }, terms: { card: 'never' } })
    );
  });

  it('exposes the Stripe instance globally if running in a Cypress context', () => {
    const mockStripe = {};

    (window as any).Cypress = true;
    useStripeMock.mockReturnValue(mockStripe as any);
    tree();
    expect((window as any).stripe).toBe(mockStripe);
  });

  it("doesn't expose the Stripe instance globally if not running in Cypress", () => {
    tree();
    expect((window as any).stripe).toBeUndefined();
  });

  it('shows a submit button with an appropriate label for a one-time payment', () => {
    tree();
    expect(
      screen.getByRole('button', {
        name: 'stripeFns.paymentElementButtonText.one_time{"amount":"mock-currency-symbol123.45 mock-currency-code"}'
      })
    ).toBeVisible();
  });

  it('shows a submit button with an appropriate label for a monthly payment', () => {
    tree({ payment: { ...mockPayment, interval: 'month' } });
    expect(
      screen.getByRole('button', {
        name: 'stripeFns.paymentElementButtonText.month{"amount":"mock-currency-symbol123.45 mock-currency-code"}'
      })
    ).toBeVisible();
  });

  it('shows a submit button with an appropriate label for a yearly payment', () => {
    tree({ payment: { ...mockPayment, interval: 'year' } });
    expect(
      screen.getByRole('button', {
        name: 'stripeFns.paymentElementButtonText.year{"amount":"mock-currency-symbol123.45 mock-currency-code"}'
      })
    ).toBeVisible();
  });

  describe('After submitting the form', () => {
    // The awaits in the tests are to allow pending updates to complete. Unclear
    // why, but putting them into afterEach() doesn't work.

    it('disables the form submit button initially', async () => {
      tree();
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByRole('button')).toBeDisabled();
      await act(() => Promise.resolve());
    });

    describe.each([
      ['payment intent', 'pi_mock-payment-intent-id', 'confirmPayment', 'confirmSetup'],
      ['setup intent', 'seti_mock-setup-intent-id', 'confirmSetup', 'confirmPayment']
    ])('For payments that contain a %s with client secret %s', (_, clientSecret, finalizerName, badFinalizerName) => {
      const payment: Payment = { ...mockPayment, stripe: { ...mockPayment.stripe, clientSecret } };
      let error: jest.SpyInstance;

      beforeEach(() => {
        error = jest.fn();
        useAlertMock.mockReturnValue({ error } as any);
      });

      it(`finalizes the Stripe payment using ${finalizerName}, not ${badFinalizerName}`, async () => {
        const badFinalizer = jest.fn();
        const finalizer = jest.fn(() => Promise.resolve({}));
        const mockElements: any = {};

        useStripeMock.mockReturnValue({ [badFinalizerName]: badFinalizer, [finalizerName]: finalizer } as any);
        tree({ payment });
        expect(finalizer).not.toBeCalled();
        fireEvent.click(screen.getByRole('button'));
        await act(() => Promise.resolve());
        expect(badFinalizer).not.toBeCalled();
        expect(finalizer.mock.calls).toEqual([
          [
            {
              confirmParams: {
                payment_method_data: {
                  billing_details: payment.stripe.billingDetails
                },
                return_url: successUrl(payment)
              },
              elements: mockElements
            }
          ]
        ]);
      });

      describe.each([
        ['card_error', 'message in the error object', 'message in the error object'],
        ['validation_error', 'message in the error object', 'message in the error object'],
        ['generic', '', 'donationPage.stripePaymentForm.errorProcessingPayment']
      ])('But finalizing the payment fails immediately with a %s error type', (type, message, expectedError) => {
        let finalizer: jest.Mock;

        beforeEach(() => {
          finalizer = jest.fn(() => ({ error: { type, message } }));
          useStripeMock.mockReturnValue({ [finalizerName]: finalizer } as any);
        });

        it(`shows a "${expectedError}" alert`, async () => {
          tree({ payment });
          expect(error).not.toBeCalled();
          fireEvent.click(screen.getByRole('button'));
          await act(() => Promise.resolve());
          expect(error.mock.calls).toEqual([[expectedError]]);
        });

        it('re-enables the submit button', async () => {
          tree({ payment });

          const button = screen.getByRole('button');

          expect(button).toBeEnabled();
          fireEvent.click(button);
          expect(button).toBeDisabled();
          await act(() => Promise.resolve());
          expect(button).toBeEnabled();
        });
      });

      describe('But finalizing the payment fails asynchronously', () => {
        let errorSpy: jest.SpyInstance;
        let finalizer: jest.SpyInstance;

        beforeEach(() => {
          errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
          finalizer = jest.fn(() => Promise.reject());
          useStripeMock.mockReturnValue({ [finalizerName]: finalizer } as any);
        });

        afterEach(() => errorSpy.mockReset());

        it('shows an error message', async () => {
          tree({ payment });
          expect(error).not.toBeCalled();
          fireEvent.click(screen.getByRole('button'));
          await act(() => Promise.resolve());
          expect(error.mock.calls).toEqual([['donationPage.stripePaymentForm.errorProcessingPayment']]);
        });

        it('re-enables the submit button', async () => {
          tree({ payment });

          const button = screen.getByRole('button');

          expect(button).toBeEnabled();
          fireEvent.click(button);
          expect(button).toBeDisabled();
          await act(() => Promise.resolve());
          expect(button).toBeEnabled();
        });
      });
    });
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
