import { axe } from 'jest-axe';
import { SETTINGS } from 'routes';
import { fireEvent, render, screen } from 'test-utils';
import SidebarCoreUpgradePrompt, { SidebarCoreUpgradePromptProps } from './SidebarCoreUpgradePrompt';

function tree(props?: Partial<SidebarCoreUpgradePromptProps>) {
  return render(<SidebarCoreUpgradePrompt onClose={jest.fn()} {...props} />);
}

describe('SidebarCoreUpgradePrompt', () => {
  it('displays a link to the subscription page', () => {
    tree();

    const link = screen.getByRole('button', { name: 'Upgrade' });

    expect(link).toBeVisible();
    expect(link).toHaveAttribute('href', SETTINGS.SUBSCRIPTION);
  });

  it('displays a button that calls the onClose prop when clicked', () => {
    const onClose = jest.fn();

    tree({ onClose });
    expect(onClose).not.toBeCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toBeCalledTimes(1);
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
