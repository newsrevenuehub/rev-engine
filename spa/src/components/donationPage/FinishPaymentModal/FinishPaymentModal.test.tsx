import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import FinishPaymentModal, { FinishPaymentModalProps } from './FinishPaymentModal';

jest.mock('components/paymentProviders/stripe/StripePaymentWrapper');
jest.mock('./ContributionDisclaimer');
jest.mock('./StripePaymentForm');

const mockPayment: any = {
  amount: 'mock-amount',
  currency: {
    code: 'mock-currency-code',
    symbol: 'mock-currency-symbol'
  },
  interval: 'one_time',
  stripe: {
    accountId: 'mock-account-id',
    clientSecret: 'mock-client-secret'
  }
};

function tree(props?: Partial<FinishPaymentModalProps>) {
  return render(
    <FinishPaymentModal
      onCancel={jest.fn()}
      onError={jest.fn()}
      open
      payment={mockPayment}
      locale={'mock-locale' as any}
      {...props}
    />
  );
}

describe('FinishPaymentModal', () => {
  it('shows nothing if not open', () => {
    tree({ open: false });
    expect(screen.getByTestId('mock-stripe-payment-wrapper-children')).toBeEmptyDOMElement();
  });

  describe('When open', () => {
    it('shows a back button which calls the onCancel prop when clicked', () => {
      const onCancel = jest.fn();

      tree({ onCancel });
      expect(onCancel).not.toBeCalled();
      fireEvent.click(screen.getByRole('button', { name: 'common.actions.back' }));
      expect(onCancel).toBeCalledTimes(1);
    });

    it('shows a Stripe payment wrapper configured with the onError prop passed and Stripe details in the payment prop', () => {
      const onError = jest.fn();

      tree({ onError });

      const wrapper = screen.getByTestId('mock-stripe-payment-wrapper');

      expect(wrapper).toBeInTheDocument();
      expect(wrapper.dataset.stripeAccountId).toBe(mockPayment.stripe.accountId);
      expect(wrapper.dataset.stripeClientSecret).toBe(mockPayment.stripe.clientSecret);
      expect(wrapper.dataset.stripeLocale).toBe('mock-locale');
      expect(onError).not.toBeCalled();

      // This is hidden by the open modal, but shouldn't matter in practice
      // since it's a mocked button.

      fireEvent.click(screen.getByRole('button', { name: 'onError', hidden: true }));
      expect(onError).toBeCalledTimes(1);
    });

    it('shows a Stripe payment form with the payment provided', () => {
      tree();

      const paymentForm = screen.getByTestId('mock-stripe-payment-form');

      expect(paymentForm).toBeInTheDocument();
      expect(paymentForm.dataset.payment).toBe(JSON.stringify(mockPayment));
    });

    it('shows a disclaimer with interval and amount props based on the payment prop, and date based on the current one', () => {
      jest.useFakeTimers().setSystemTime(new Date('2020-01-01'));
      tree();

      const disclaimer = screen.getByTestId('mock-contribution-disclaimer');

      expect(disclaimer).toBeInTheDocument();
      expect(disclaimer.dataset.formattedAmount).toBe('mock-currency-symbolmock-amount mock-currency-code');
      expect(disclaimer.dataset.interval).toBe(mockPayment.interval);
      expect(disclaimer.dataset.processingDate).toBe(new Date().toString());
      jest.useRealTimers();
    });

    it('is accessible', async () => {
      const { container } = tree();

      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
