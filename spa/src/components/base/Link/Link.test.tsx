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

  // These use direct node queries because the SVG image is presentational, so
  // we can't reach it with Testing Library.

  it("doesn't display an external icon by default", () => {
    tree({ children: 'label', href: 'test-url' });
    expect(document.querySelector('svg')).not.toBeInTheDocument();
  });

  it('displays an external icon if that prop is set', () => {
    tree({ children: 'label', external: true, href: 'test-url' });
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('is accessible', async () => {
    const { container } = tree({ children: 'label' });

    expect(await axe(container)).toHaveNoViolations();
  });
});
