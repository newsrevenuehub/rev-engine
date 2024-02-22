import { PLUS_UPGRADE_URL } from 'constants/helperUrls';
import { Organization, User } from 'hooks/useUser.types';
import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import UpgradePlan, { UpgradePlanProps } from './UpgradePlan';

jest.mock('components/common/StripePricingTable/StripePricingTable');

// Getters here are so we can change these in specific tests.
// See https://jestjs.io/docs/jest-object#jestspyonobject-methodname-accesstype
// and https://stackoverflow.com/a/64262146

const mockTableIdGetter = jest.fn();
const mockTableKeyGetter = jest.fn();

jest.mock('appSettings', () => ({
  get STRIPE_SELF_UPGRADE_PRICING_TABLE_ID() {
    return mockTableIdGetter();
  },
  get STRIPE_SELF_UPGRADE_PRICING_TABLE_PUBLISHABLE_KEY() {
    return mockTableKeyGetter();
  }
}));

const mockOrg = { id: -1, plan: { name: 'CORE' }, uuid: '1235467abcdef' } as Organization;
const mockUser = { email: 'mock-user-email' } as unknown as User;

function tree(props?: Partial<UpgradePlanProps>) {
  return render(<UpgradePlan organization={mockOrg} user={mockUser} {...props} />);
}

describe('UpgradePlan', () => {
  beforeEach(() => {
    mockTableIdGetter.mockReturnValue('mock-pricing-table-id');
    mockTableKeyGetter.mockReturnValue('mock-publishable-key');
  });

  describe('When the user is on the Free plan', () => {
    it('displays a header', () => {
      tree({ organization: { ...mockOrg, plan: { name: 'FREE' } } as Organization });
      expect(screen.getByText('Upgrade Plan')).toBeVisible();
    });

    it('displays a pricing table with configured app settings', () => {
      tree({
        organization: { ...mockOrg, plan: { name: 'FREE' } } as Organization
      });

      const table = screen.getByTestId('mock-stripe-pricing-table');

      expect(table).toBeInTheDocument();
      expect(table.dataset.clientReferenceId).toBe(mockOrg.uuid);
      expect(table.dataset.customerEmail).toBe(mockUser.email);
      expect(table.dataset.pricingTableId).toBe('mock-pricing-table-id');
      expect(table.dataset.publishableKey).toBe('mock-publishable-key');
    });

    it("doesn't display the pricing table if the pricing table ID isn't configured", () => {
      mockTableIdGetter.mockReturnValue(undefined);
      tree({
        organization: { ...mockOrg, plan: { name: 'FREE' } } as Organization
      });
      expect(screen.queryByTestId('mock-stripe-pricing-table')).not.toBeInTheDocument();
    });

    it("doesn't display the pricing table if the pricing table publishable key isn't configured", () => {
      mockTableKeyGetter.mockReturnValue(undefined);
      tree({
        organization: { ...mockOrg, plan: { name: 'FREE' } } as Organization
      });
      expect(screen.queryByTestId('mock-stripe-pricing-table')).not.toBeInTheDocument();
    });

    it("doesn't display the Plus feature list", () => {
      tree({
        organization: { ...mockOrg, plan: { name: 'FREE' } } as Organization
      });
      expect(screen.queryByText('Plus Tier')).not.toBeInTheDocument();
    });

    it('is accessible', async () => {
      const { container } = tree({
        organization: { ...mockOrg, plan: { name: 'FREE' } } as Organization
      });

      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe('When the user is on the Core plan', () => {
    it('displays a header', () => {
      tree();
      expect(screen.getByText('Upgrade Plan')).toBeVisible();
    });

    it("doesn't display a pricing table", () => {
      tree();
      expect(screen.queryByTestId('mock-stripe-pricing-table')).not.toBeInTheDocument();
    });

    it('displays the Plus feature list', () => {
      tree();
      expect(screen.getByText('Plus Tier')).toBeVisible();
    });

    it('displays a link to upgrade', () => {
      tree();

      const link = screen.getByRole('link', { name: 'Join the Waitlist' });

      expect(link).toBeVisible();
      expect(link).toHaveAttribute('href', PLUS_UPGRADE_URL);
    });

    it('is accessible', async () => {
      const { container } = tree();

      expect(await axe(container)).toHaveNoViolations();
    });
  });

  it('displays nothing if the user is on the Plus plan, even if they have the self-upgrade feature flag', () => {
    tree({ organization: { ...mockOrg, plan: { name: 'PLUS' } } as Organization });
    expect(document.body).toHaveTextContent('');
  });
});
