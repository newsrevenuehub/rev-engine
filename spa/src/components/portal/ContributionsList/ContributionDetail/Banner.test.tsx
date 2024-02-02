import { PortalContributionDetail } from 'hooks/usePortalContribution';
import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import Banner, { BannerProps } from './Banner';

const mockContribution: PortalContributionDetail = {
  amount: 12345,
  card_brand: 'amex',
  card_expiration_date: new Date().toISOString(),
  card_last_4: '7890',
  card_owner_name: 'mock-cc-owner-name',
  created: new Date().toISOString(),
  interval: 'month',
  is_cancelable: false,
  is_modifiable: false,
  last_payment_date: new Date().toISOString(),
  next_payment_date: new Date().toISOString(),
  paid_fees: false,
  payments: [],
  id: 1,
  payment_type: 'card',
  revenue_program: 1,
  status: 'paid'
};

function tree(props?: Partial<BannerProps>) {
  return render(<Banner contribution={mockContribution} {...props} />);
}

describe('Banner', () => {
  describe('Status = Canceled', () => {
    it('should render title', () => {
      tree({ contribution: { ...mockContribution, status: 'canceled' } });
      expect(screen.getByText('Canceled')).toBeVisible();
    });
    it('should render description', () => {
      tree({ contribution: { ...mockContribution, status: 'canceled' } });
      expect(
        screen.getByText(
          'This contribution was canceled. Help our community and continue your support of our mission by creating a new contribution.'
        )
      ).toBeVisible();
    });

    it('is accessible', async () => {
      const { container } = tree({ contribution: { ...mockContribution, status: 'canceled' } });

      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe('Status = Failed', () => {
    // TODO: DEV-4464: update test when "Failed" banner is implemented
    it('should not render', () => {
      tree({ contribution: { ...mockContribution, status: 'paid' } });
      expect(document.body.textContent).toBe('');
    });
  });

  describe('Status = Paid', () => {
    it('should not render', () => {
      tree({ contribution: { ...mockContribution, status: 'paid' } });
      expect(document.body.textContent).toBe('');
    });
  });
});
