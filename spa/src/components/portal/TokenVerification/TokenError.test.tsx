import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import TokenError from './TokenError';

function tree() {
  return render(<TokenError />);
}

describe('TokenError', () => {
  it('displays an error message', () => {
    tree();
    expect(screen.getByText('We were unable to log you in.')).toBeInTheDocument();
  });

  it('displays a link to get another magic link', () => {
    tree();

    const link = screen.getByRole('link');

    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/portal/');
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
