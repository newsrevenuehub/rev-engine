import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import { PortalContributionDetail } from 'hooks/usePortalContribution';
import BillingDetails, { BillingDetailsProps, INTERVAL_NAMES } from './BillingDetails';

jest.mock('../DetailSection/DetailSection');

const mockContribution: PortalContributionDetail = {
  amount: 12345,
  card_brand: 'amex',
  card_expiration_date: new Date().toISOString(),
  card_last_4: '7890',
  card_owner_name: 'mock-cc-owner-name',
  created: new Date().toISOString(),
  interval: 'month',
  is_cancelable: false,
  is_modifiable: true,
  first_payment_date: new Date().toISOString(),
  last_payment_date: new Date().toISOString(),
  next_payment_date: new Date().toISOString(),
  paid_fees: false,
  payments: [],
  id: 1,
  payment_type: 'card',
  revenue_program: {
    organization: {
      plan: {
        name: 'PLUS'
      }
    }
  } as any,
  status: 'paid',
  stripe_account_id: 'mock-stripe-account-id'
};

const defaultProps = {
  contribution: mockContribution,
  disabled: false,
  editable: false,
  onEdit: jest.fn(),
  onEditComplete: jest.fn(),
  onUpdateBillingDetails: jest.fn()
};

function tree(props?: Partial<BillingDetailsProps>) {
  return render(<BillingDetails {...defaultProps} {...props} />);
}

describe('BillingDetails', () => {
  describe('In read-only mode', () => {
    it('shows a header', () => {
      tree();
      expect(screen.getByText('Billing Details')).toBeInTheDocument();
    });

    it("doesn't highlight its section", () => {
      tree();
      expect(screen.getByTestId('mock-detail-section').dataset.highlighted).toBe('false');
    });

    it('enables its section if not passed a disabled prop', () => {
      tree();
      expect(screen.getByTestId('mock-detail-section').dataset.disabled).toBe('false');
    });

    it('disables its section if passed a disabled prop', () => {
      tree({ disabled: true });
      expect(screen.getByTestId('mock-detail-section').dataset.disabled).toBe('true');
    });

    it('shows the formatted amount of the contribution', () => {
      tree();
      expect(screen.getByTestId('amount')).toHaveTextContent('$123.45');
    });

    it("shows a disabled, unchecked checkbox if the contribution didn't include fees", () => {
      tree({ contribution: { ...mockContribution, paid_fees: false } });

      const checkbox = screen.getByRole('checkbox', { name: 'Pay fees' });

      expect(checkbox).toBeDisabled();
      expect(checkbox).not.toBeChecked();
    });

    it('shows a disabled, checked checkbox if the contribution did include fees', () => {
      tree({ contribution: { ...mockContribution, paid_fees: true } });

      const checkbox = screen.getByRole('checkbox', { name: 'Pay fees' });

      expect(checkbox).toBeDisabled();
      expect(checkbox).toBeChecked();
    });

    // TODO in DEV-5138: Only need to test first_payment_date
    it('shows the formatted date of the contribution when first_payment_date is set', () => {
      const first_payment_date = new Date('1/23/45').toISOString();

      tree({ contribution: { ...mockContribution, first_payment_date } });
      expect(screen.getByTestId('first-billing-date')).toHaveTextContent('January 23, 2045');
    });

    it('shows the formatted date of the contribution when first_payment_date is null', () => {
      const created = new Date('1/23/45').toISOString();

      tree({ contribution: { ...mockContribution, created, first_payment_date: null } });
      expect(screen.getByTestId('first-billing-date')).toHaveTextContent('January 23, 2045');
    });

    it.each(Object.entries(INTERVAL_NAMES))('shows a %s interval as "%s" frequency', (interval, intervalLabel) => {
      tree({ contribution: { ...mockContribution, interval } as any });
      expect(screen.getByTestId('frequency')).toHaveTextContent(intervalLabel);
    });

    describe.each(['FREE', 'CORE'])('%s plan', (plan) => {
      it('does not show "Change billing details"', () => {
        tree({
          contribution: { ...mockContribution, revenue_program: { organization: { plan: { name: plan } } } as any }
        });
        expect(screen.queryByRole('button', { name: 'Change billing details' })).not.toBeInTheDocument();
      });
    });

    describe('PLUS plan', () => {
      it('shows "Change billing details" if the contribution is modifiable', () => {
        tree();
        expect(screen.getByRole('button', { name: 'Change billing details' })).toBeInTheDocument();
      });

      it('does not show "Change billing details" if the contribution is not modifiable', () => {
        tree({ contribution: { ...mockContribution, is_modifiable: false } });
        expect(screen.queryByRole('button', { name: 'Change billing details' })).not.toBeInTheDocument();
      });
    });

    it('is accessible', async () => {
      const { container } = tree();

      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe('In editable mode', () => {
    it('highlights its section', () => {
      tree({ editable: true });
      expect(screen.getByTestId('mock-detail-section').dataset.highlighted).toBe('true');
    });

    it('shows a cancel button which calls onEditComplete when clicked', () => {
      tree({ editable: true });
      expect(defaultProps.onEditComplete).not.toHaveBeenCalled();
      screen.getByRole('button', { name: 'Cancel' }).click();
      expect(defaultProps.onEditComplete).toHaveBeenCalledTimes(1);
    });

    it('initially sets the contribution amount as the value of the amount input', () => {
      tree({ editable: true });
      expect(screen.getByRole('textbox', { name: /amount/i })).toHaveValue('123.45');
    });

    describe('The Save button', () => {
      it('is initially disabled', () => {
        tree({ editable: true });
        expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
      });

      it('is enabled when the amount input is changed', () => {
        tree({ editable: true });
        const amountInput = screen.getByRole('textbox', { name: /amount/i });

        expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
        fireEvent.change(amountInput, { target: { value: '99.99' } });
        expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
      });

      it('disables if previously enabled, but amount is set to initial value', () => {
        tree({ editable: true });
        const amountInput = screen.getByRole('textbox', { name: /amount/i });

        expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
        fireEvent.change(amountInput, { target: { value: '99.99' } });
        expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
        fireEvent.change(amountInput, { target: { value: '123.45' } });
        expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
      });

      it('is disabled if the amount is empty', () => {
        tree({ editable: true });
        const amountInput = screen.getByRole('textbox', { name: /amount/i });

        expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
        fireEvent.change(amountInput, { target: { value: '' } });
        expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
      });

      it('is disabled if the amount is zero', () => {
        tree({ editable: true });
        const amountInput = screen.getByRole('textbox', { name: /amount/i });

        expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
        fireEvent.change(amountInput, { target: { value: '0' } });
        expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
      });

      it('is disabled if the amount is not a valid number', () => {
        tree({ editable: true });
        const amountInput = screen.getByRole('textbox', { name: /amount/i });

        expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
        fireEvent.change(amountInput, { target: { value: 'abc' } });
        expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
      });

      it('is accessible', async () => {
        const { container } = tree({ editable: true });

        expect(await axe(container)).toHaveNoViolations();
      });

      describe('When clicked', () => {
        it('calls onUpdateBillingDetails with the amount in cents', () => {
          tree({ editable: true });
          const amountInput = screen.getByRole('textbox', { name: /amount/i });

          fireEvent.change(amountInput, { target: { value: '99.99' } });
          screen.getByRole('button', { name: 'Save' }).click();

          expect(defaultProps.onUpdateBillingDetails).toHaveBeenCalledWith(9999);
        });

        it('calls onEditComplete', () => {
          tree({ editable: true });
          const amountInput = screen.getByRole('textbox', { name: /amount/i });

          fireEvent.change(amountInput, { target: { value: '99.99' } });
          screen.getByRole('button', { name: 'Save' }).click();
          expect(defaultProps.onEditComplete).toHaveBeenCalledTimes(1);
        });
      });
    });
  });
});
