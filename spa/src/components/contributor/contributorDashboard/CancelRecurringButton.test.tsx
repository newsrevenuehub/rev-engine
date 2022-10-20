import userEvent from '@testing-library/user-event';
import { ContributorContribution } from 'hooks/useContributorContributionList';
import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import { CancelRecurringButton, CancelRecurringButtonProps } from './CancelRecurringButton';

const mockContribution: ContributorContribution = {
  id: 'mock-id',
  amount: 12345,
  card_brand: 'visa',
  created: 'mock-created',
  interval: 'month',
  last4: 1234,
  revenue_program: 'mock-rp',
  status: 'paid',
  credit_card_expiration_date: 'mock-cc-expiration',
  is_cancelable: false,
  is_modifiable: false,
  last_payment_date: 'mock-last-payment-date',
  payment_type: 'mock-payment-type',
  provider_customer_id: 'mock-customer-id',
  stripe_account_id: 'mock-account-id'
};

describe('CancelRecurringButton', () => {
  function tree(props?: Partial<CancelRecurringButtonProps>) {
    return render(<CancelRecurringButton contribution={mockContribution} onCancel={jest.fn()} {...props} />);
  }

  function getCancelButton() {
    return screen.getByRole('button', { name: 'Cancel' });
  }

  describe('When the modal is not open', () => {
    it('shows a button to open the modal', () => {
      tree();
      expect(getCancelButton()).toBeInTheDocument();
    });

    it('shows nothing if the contribution is one-time', () => {
      tree({ contribution: { ...mockContribution, interval: 'one_time' } });
      expect(document.body.textContent).toBe('');
    });

    it('shows nothing if the contribution is cancelled', () => {
      tree({ contribution: { ...mockContribution, status: 'canceled' } });
      expect(document.body.textContent).toBe('');
    });

    it('opens the modal when the button is clicked', () => {
      tree();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      userEvent.click(getCancelButton());
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('is accessible', async () => {
      const { container } = tree();

      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe('When the modal is open', () => {
    let onCancel: jest.Mock;

    beforeEach(() => (onCancel = jest.fn()));

    it('shows the user the amount', () => {
      // Amount is in cents.

      tree({ contribution: { ...mockContribution, revenue_program: 'test-rp', amount: 456789 } });
      userEvent.click(getCancelButton());
      expect(
        screen.getByText('Are you sure you want to cancel your recurring payment of $4,567.89?')
      ).toBeInTheDocument();
    });

    it('shows a button that closes the dialog and does nothing', () => {
      tree({ onCancel });
      userEvent.click(getCancelButton());
      userEvent.click(screen.getByRole('button', { name: 'No, Keep Payment' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(onCancel).not.toBeCalled();
    });

    it('closes the dialog and does nothing if the user clicks the close button', () => {
      tree({ onCancel });
      userEvent.click(getCancelButton());
      userEvent.click(screen.getByRole('button', { name: 'Close' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(onCancel).not.toBeCalled();
    });

    it('closes the dialog and calls onCancel if the user clicks the confirm button', () => {
      tree({ contribution: mockContribution, onCancel });
      userEvent.click(getCancelButton());
      expect(onCancel).not.toBeCalled();
      userEvent.click(screen.getByRole('button', { name: 'Yes, Cancel' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(onCancel.mock.calls).toEqual([[mockContribution]]);
    });

    it('is accessible', async () => {
      tree();
      userEvent.click(getCancelButton());
      expect(await axe(document.body)).toHaveNoViolations();
      expect(await axe(screen.getByRole('dialog'))).toHaveNoViolations();
    });
  });
});
