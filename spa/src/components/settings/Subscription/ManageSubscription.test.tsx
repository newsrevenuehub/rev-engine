import { addBreadcrumb } from '@sentry/react';
import { SELF_UPGRADE_ACCESS_FLAG_NAME } from 'constants/featureFlagConstants';
import { Organization, User } from 'hooks/useUser.types';
import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import ManageSubscription, { ManageSubscriptionProps } from './ManageSubscription';

const mockURL = jest.fn();

jest.mock('@sentry/react');
jest.mock('appSettings', () => ({
  get STRIPE_SELF_UPGRADE_CUSTOMER_PORTAL_URL() {
    return mockURL();
  }
}));

const mockOrg = { plan: { name: 'CORE' } } as Organization;
const mockUser = { flags: [{ name: SELF_UPGRADE_ACCESS_FLAG_NAME }] } as unknown as User;

function tree(props?: Partial<ManageSubscriptionProps>) {
  return render(<ManageSubscription user={mockUser} organization={mockOrg} {...props} />);
}

describe('ManageSubscription', () => {
  const addBreadcrumbMock = addBreadcrumb as jest.Mock;

  beforeEach(() => {
    mockURL.mockReturnValue('mock-customer-portal-url');
  });

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

  it('when STRIPE_SELF_UPGRADE_CUSTOMER_PORTAL_URL is non-empty string, no errors are triggered', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    tree();

    expect(addBreadcrumbMock).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  describe('Error handling', () => {
    describe('when STRIPE_SELF_UPGRADE_CUSTOMER_PORTAL_URL is not valid', () => {
      describe.each([null, undefined, 123, true, false, {}, ''])('url is: %p', (url) => {
        let consoleErrorSpy: jest.SpyInstance;
        beforeEach(() => {
          mockURL.mockReturnValue(url);
          consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        });

        afterEach(() => {
          consoleErrorSpy.mockRestore();
        });

        it('logs a breadcrumb', () => {
          expect(addBreadcrumbMock).not.toHaveBeenCalled();
          tree();

          expect(addBreadcrumbMock).toHaveBeenCalledWith({
            category: 'rev-engine',
            level: 'debug',
            message: `Manage my plan URL: "${url}"`
          });
        });

        it('logs a console error', () => {
          const error = jest.fn();
          consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(error);
          tree();
          expect(error).toHaveBeenCalledWith('STRIPE_SELF_UPGRADE_CUSTOMER_PORTAL_URL is not valid.');
        });
      });
    });
  });
});
