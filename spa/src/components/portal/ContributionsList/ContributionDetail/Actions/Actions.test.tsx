import { PortalContributionDetail } from 'hooks/usePortalContribution';
import { axe } from 'jest-axe';
import { act, render, screen, waitFor } from 'test-utils';
import Actions, { ActionsProps } from './Actions';

const mockContribution: PortalContributionDetail = {
  amount: 12345,
  card_brand: 'amex',
  card_expiration_date: new Date().toISOString(),
  card_last_4: '7890',
  card_owner_name: 'mock-cc-owner-name',
  created: new Date().toISOString(),
  first_payment_date: new Date().toISOString(),
  interval: 'month',
  is_cancelable: false,
  is_modifiable: false,
  last_payment_date: new Date().toISOString(),
  next_payment_date: new Date().toISOString(),
  stripe_account_id: 'mock-stripe-account-id',
  paid_fees: false,
  payments: [],
  id: 1,
  payment_type: 'card',
  revenue_program: 1,
  status: 'paid'
};

const onCancelContribution = jest.fn();

function tree(props?: Partial<ActionsProps>) {
  return render(<Actions contribution={mockContribution} onCancelContribution={onCancelContribution} {...props} />);
}

describe('Actions', () => {
  describe('Cancel Contribution', () => {
    it('should render cancel contribution button', () => {
      tree({ contribution: { ...mockContribution, is_cancelable: true } });
      expect(screen.getByRole('button', { name: 'Cancel Contribution' })).toBeEnabled();
    });

    it('should not render cancel contribution button', () => {
      tree({ contribution: { ...mockContribution, is_cancelable: false } });
      expect(screen.queryByRole('button', { name: 'Cancel Contribution' })).not.toBeInTheDocument();
    });

    it('should render CancelContributionModal if cancel button is clicked', async () => {
      tree({ contribution: { ...mockContribution, is_cancelable: true } });
      expect(screen.queryByTestId('cancel-contribution-modal')).not.toBeInTheDocument();

      screen.getByRole('button', { name: 'Cancel Contribution' }).click();

      await waitFor(() => {
        expect(screen.getByTestId('cancel-contribution-modal')).toBeVisible();
      });
    });

    it('should call onCancelContribution when cancel confirmation is clicked', async () => {
      tree({ contribution: { ...mockContribution, is_cancelable: true } });
      expect(screen.queryByTestId('cancel-contribution-modal')).not.toBeInTheDocument();

      screen.getByRole('button', { name: 'Cancel Contribution' }).click();

      await waitFor(() => {
        expect(screen.getByTestId('cancel-contribution-modal')).toBeVisible();
      });

      expect(onCancelContribution).not.toHaveBeenCalled();

      await act(async () => {
        await screen.getByRole('button', { name: 'Yes, cancel' }).click();
      });

      expect(onCancelContribution).toHaveBeenCalledWith();
      expect(onCancelContribution).toHaveBeenCalledTimes(1);

      expect(screen.queryByTestId('cancel-contribution-modal')).not.toBeInTheDocument();
    });

    it('is accessible', async () => {
      const { container } = tree({ contribution: { ...mockContribution, is_cancelable: true } });

      expect(await axe(container)).toHaveNoViolations();
    });
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
