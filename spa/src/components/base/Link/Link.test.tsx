import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import Link, { LinkProps } from './Link';

function tree(props?: Partial<LinkProps>) {
  return render(<Link {...props} />);
}

describe('Link', () => {
  it('displays a link with the href and text set', () => {
    tree({ children: 'label', href: 'test-url' });

    const link = screen.getByRole('link');

    expect(link).toBeVisible();
    expect(link).toHaveAttribute('href', 'test-url');
    expect(link).toHaveTextContent('label');
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
