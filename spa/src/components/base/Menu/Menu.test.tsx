import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import Menu, { MenuProps } from './Menu';

function tree(props?: Partial<MenuProps>) {
  return render(
    <Menu anchorEl={document.body} open {...props}>
      child
    </Menu>
  );
}

describe('Menu', () => {
  it('displays nothing when closed', () => {
    tree({ open: false });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  describe('When open', () => {
    it('displays a menu', () => {
      tree({ open: true });
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('displays children', () => {
      tree({ open: true });
      expect(screen.getByText('child')).toBeVisible();
    });
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
