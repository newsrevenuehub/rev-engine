import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import Pagination, { PaginationProps } from './Pagination';

function tree(props?: PaginationProps) {
  return render(<Pagination count={2} page={1} {...props} />);
}

describe('Pagination', () => {
  it('renders a navigation', () => {
    tree();
    expect(screen.getByRole('navigation')).toBeVisible();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
