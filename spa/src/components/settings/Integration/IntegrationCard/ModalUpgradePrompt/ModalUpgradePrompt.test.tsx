import { PRICING_URL } from 'constants/helperUrls';
import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import ModalUpgradePrompt, { ModalUpgradePromptProps } from './ModalUpgradePrompt';

function tree(props?: Partial<ModalUpgradePromptProps>) {
  return render(<ModalUpgradePrompt text="mock-text" {...props} />);
}

describe('ModalUpgradePrompt', () => {
  it('displays a link to the pricing page', () => {
    tree();

    const link = screen.getByRole('link', { name: 'Learn More' });

    expect(link).toBeVisible();
    expect(link).toHaveAttribute('href', PRICING_URL);
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('displays the copywriting text', () => {
    tree();
    expect(screen.getByText('mock-text')).toBeInTheDocument();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
