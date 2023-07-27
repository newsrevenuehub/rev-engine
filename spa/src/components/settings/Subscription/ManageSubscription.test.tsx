import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import ManageSubscription, { ManageSubscriptionProps } from './ManageSubscription';
import { Organization, User } from 'hooks/useUser.types';
import { SELF_UPGRADE_ACCESS_FLAG_NAME } from 'constants/featureFlagConstants';

jest.mock('appSettings', () => ({
  STRIPE_SELF_UPGRADE_CUSTOMER_PORTAL_URL: 'mock-customer-portal-url'
}));

const mockOrg = { plan: { name: 'CORE' } } as Organization;
const mockUser = { flags: [{ name: SELF_UPGRADE_ACCESS_FLAG_NAME }] } as unknown as User;

function tree(props?: Partial<ManageSubscriptionProps>) {
  return render(<ManageSubscription user={mockUser} organization={mockOrg} {...props} />);
}

describe('ManageSubscription', () => {
  it('shows nothing if the user is on the Free plan, even if they have the self-upgrade feature flag', () => {
    tree({ organization: { plan: { name: 'FREE' } } as Organization });
    expect(document.body).toHaveTextContent('');
  });

  it("shows nothing if the user doesn't have the self-upgrade feature flag, even if they're on a nonfree plan", () => {
    tree({ user: { flags: [] } as unknown as User });
    expect(document.body).toHaveTextContent('');
  });

  describe('When the user has a nonfree plan and the self-upgrade feature flag', () => {
    it('shows a header', () => {
      tree();
      expect(screen.getByText('Manage Subscription')).toBeInTheDocument();
    });

    it('shows a link to STRIPE_SELF_UPGRADE_CUSTOMER_PORTAL_URL', () => {
      tree();

      const link = screen.getByRole('link', { name: 'Manage my plan' });

      expect(link).toBeVisible();
      expect(link).toHaveAttribute('href', 'mock-customer-portal-url');
      expect(link).toHaveAttribute('target', '_blank');
    });

    it('is accessible', async () => {
      const { container } = tree();

      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
