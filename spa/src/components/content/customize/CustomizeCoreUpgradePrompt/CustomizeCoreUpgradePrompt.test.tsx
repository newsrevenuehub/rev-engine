import { PRICING_URL } from 'constants/helperUrls';
import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import CustomizeCoreUpgradePrompt, { CustomizeCoreUpgradePromptProps } from './CustomizeCoreUpgradePrompt';
import { SELF_UPGRADE_ACCESS_FLAG_NAME } from 'constants/featureFlagConstants';
import { SETTINGS } from 'routes';

const mockUser = { flags: [] } as any;

function tree(props?: Partial<CustomizeCoreUpgradePromptProps>) {
  return render(<CustomizeCoreUpgradePrompt onClose={jest.fn()} user={mockUser} {...props} />);
}

describe('CustomizeCoreUpgradePrompt', () => {
  describe.each([
    [
      'has the self-upgrade feature flag',
      [{ name: SELF_UPGRADE_ACCESS_FLAG_NAME }],
      { href: SETTINGS.SUBSCRIPTION, role: 'button', target: undefined }
    ],
    ["doesn't have the self-upgrade feature flag", [], { href: PRICING_URL, role: 'link', target: '_blank' }]
  ])('When the user %s', (_, flags, { href, role, target }) => {
    it('displays a link to the pricing page', () => {
      expect.assertions(3);
      tree({ user: { flags } as any });

      const link = screen.getByRole(role, { name: 'Upgrade' });

      expect(link).toBeVisible();
      expect(link).toHaveAttribute('href', href);

      // Set total expected assertions at the top of the test.
      /* eslint-disable jest/no-conditional-expect */

      if (target) {
        expect(link).toHaveAttribute('target', target);
      } else {
        expect(link).not.toHaveAttribute('target');
      }

      /* eslint-enable jest/no-conditional-expect */
    });

    it('displays a button that calls the onClose prop when clicked', () => {
      const onClose = jest.fn();

      tree({ onClose, user: { flags } as any });
      expect(onClose).not.toBeCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
      expect(onClose).toBeCalledTimes(1);
    });

    it('is accessible', async () => {
      const { container } = tree({ user: { flags } as any });

      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
