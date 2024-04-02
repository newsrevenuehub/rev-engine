import { PortalContributionDetail } from 'hooks/usePortalContribution';
import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import Banner, { BannerProps } from './Banner';
import usePortal from 'hooks/usePortal';

jest.mock('hooks/usePortal', () => ({
  __esModule: true,
  default: jest.fn()
}));

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
  stripe_account_id: 'mock-stripe-account-id',
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
  const usePortalMock = usePortal as jest.Mock;

  beforeEach(() => {
    usePortalMock.mockReturnValue({ page: null });
  });

  describe('Status = Canceled', () => {
    it('should render title', () => {
      tree({ contribution: { ...mockContribution, status: 'canceled' } });
      expect(screen.getByText('Canceled')).toBeVisible();
    });
    it('should render description without canceled_at date', () => {
      tree({ contribution: { ...mockContribution, status: 'canceled' } });
      expect(
        screen.getByText(
          'This contribution was canceled. Help our community and continue your support of our mission by creating a new contribution.'
        )
      ).toBeVisible();
    });

    it('should render description with canceled_at date', () => {
      tree({
        contribution: { ...mockContribution, status: 'canceled', canceled_at: new Date('1/2/2024').toISOString() }
      });
      expect(
        screen.getByText(
          'This contribution was canceled at 1/2/2024. Help our community and continue your support of our mission by creating a new contribution.'
        )
      ).toBeVisible();
    });

    it('should render link to donation page', () => {
      usePortalMock.mockReturnValue({
        page: {
          revenue_program: {
            slug: 'mock-rp-slug'
          },
          slug: 'mock-page-slug'
        }
      });

      tree({
        contribution: { ...mockContribution, status: 'canceled', canceled_at: new Date('1/2/2024').toISOString() }
      });
      const link = screen.getByRole('link', { name: 'creating a new contribution' });

      expect(link).toBeVisible();
      expect(link).toHaveAttribute('href', '//mock-rp-slug.localhost/mock-page-slug');
      expect(link).toHaveAttribute('target', '_blank');
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
