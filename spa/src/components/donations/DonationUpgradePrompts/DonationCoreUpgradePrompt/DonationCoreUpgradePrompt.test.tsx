import { PRICING_URL } from 'constants/helperUrls';
import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import DonationCoreUpgradePrompt, { DonationCoreUpgradePromptProps } from './DonationCoreUpgradePrompt';

function tree(props?: Partial<DonationCoreUpgradePromptProps>) {
  return render(<DonationCoreUpgradePrompt onClose={jest.fn()} {...props} />);
}

describe('DonationCoreUpgradePrompt', () => {
  it('displays a link to the pricing page', () => {
    tree();

    const link = screen.getByRole('link', { name: 'Learn More' });

    expect(link).toBeVisible();
    expect(link).toHaveAttribute('href', PRICING_URL);
    expect(link).toHaveAttribute('target', '_blank');
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
