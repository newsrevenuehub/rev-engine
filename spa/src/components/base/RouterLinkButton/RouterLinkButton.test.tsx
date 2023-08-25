import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import RouterLinkButton, { RouterLinkButtonProps } from './RouterLinkButton';

function tree(props?: Partial<RouterLinkButtonProps>) {
  return render(
    <RouterLinkButton to="/mock-to" {...props}>
      mock-button-label
    </RouterLinkButton>
  );
}

describe('RouterLinkButton', () => {
  it('displays a button', () => {
    tree();
    expect(screen.getByRole('button', { name: 'mock-button-label' })).toBeVisible();
  });

  it('allows setting the to prop', () => {
    tree();
    expect(screen.getByRole('button', { name: 'mock-button-label' })).toHaveAttribute('href', '/mock-to');
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
