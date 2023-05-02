import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import AdminBadge from './AdminBadge';

function tree() {
  return render(<AdminBadge />);
}

describe('AdminBadge', () => {
  it('displays an Admin label', () => {
    tree();
    expect(screen.getByText('Admin')).toBeVisible();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
