import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import { LinkButton, LinkButtonProps } from './LinkButton';

function tree(props?: Partial<LinkButtonProps>) {
  return render(
    <LinkButton href="mock-url" {...props}>
      mock-button-label
    </LinkButton>
  );
}

describe('LinkButton', () => {
  it('displays a link', () => {
    tree();
    expect(screen.getByRole('link', { name: 'mock-button-label' })).toBeVisible();
  });

  it('allows setting the href', () => {
    tree();
    expect(screen.getByRole('link', { name: 'mock-button-label' })).toHaveAttribute('href', 'mock-url');
  });

  it('allows setting the target', () => {
    tree({ target: '_blank' });
    expect(screen.getByRole('link', { name: 'mock-button-label' })).toHaveAttribute('target', '_blank');
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
