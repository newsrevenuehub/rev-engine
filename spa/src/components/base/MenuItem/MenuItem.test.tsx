import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import { MenuItem, MenuItemProps } from './MenuItem';

function tree(props?: Partial<MenuItemProps>) {
  return render(
    <div role="menu">
      <MenuItem id="mock-label" value="mock-value" aria-label="mock-option" {...props} />
    </div>
  );
}

describe('MenuItem', () => {
  it('displays a menu item', () => {
    tree({ value: 'test-value' });
    expect(screen.getByRole('menuitem')).toBeVisible();
    expect(screen.getByRole('menuitem')).toHaveAttribute('value', 'test-value');
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
