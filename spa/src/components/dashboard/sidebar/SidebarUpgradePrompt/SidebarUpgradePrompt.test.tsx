import { axe } from 'jest-axe';
import { SETTINGS } from 'routes';
import { fireEvent, render, screen } from 'test-utils';
import SidebarUpgradePrompt, { SidebarUpgradePromptProps } from './SidebarUpgradePrompt';

function tree(props?: Partial<SidebarUpgradePromptProps>) {
  return render(<SidebarUpgradePrompt currentPlan="FREE" onClose={jest.fn()} {...props} />);
}

describe('SidebarCoreUpgradePrompt', () => {
  describe.each([
    [
      'FREE',
      {
        header: 'Upgrade to Core',
        text: 'Boost your revenue with segmented email marketing.',
        cta: 'Upgrade',
        to: SETTINGS.SUBSCRIPTION
      }
    ],
    [
      'CORE',
      {
        header: 'Upgrade to Plus',
        text: 'Gain access to advanced analytics and contributor data.',
        cta: 'Upgrade',
        to: SETTINGS.SUBSCRIPTION
      }
    ],
    [
      'PLUS',
      {
        header: 'Ready for Custom Consulting?',
        text: 'Learn how our team has helped newsrooms raise $100 million. Level up!',
        cta: 'Contact Us',
        to: 'https://fundjournalism.org/news-revenue-engine-help/',
        newTab: true
      }
    ]
  ] as const)('when the user is on the %s plan', (plan, details) => {
    it(`displays a link to the ${details.cta} page`, () => {
      tree({ currentPlan: plan });

      const link = screen.getByRole('button', { name: details.cta });

      expect(link).toBeVisible();
      expect(link).toHaveAttribute('href', details.to);
    });

    it('displays the correct header', () => {
      tree({ currentPlan: plan });

      expect(screen.getByText(details.header)).toBeVisible();
    });

    it('displays the correct text', () => {
      tree({ currentPlan: plan });

      expect(screen.getByText(details.text)).toBeVisible();
    });

    it('displays a button that calls the onClose prop when clicked', () => {
      const onClose = jest.fn();

      tree({ onClose, currentPlan: plan });
      expect(onClose).not.toBeCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
      expect(onClose).toBeCalledTimes(1);
    });

    it('is accessible', async () => {
      const { container } = tree({ currentPlan: plan });

      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
