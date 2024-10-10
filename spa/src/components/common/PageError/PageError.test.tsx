import { render, screen } from 'test-utils';
import PageError, { PageErrorProps } from './PageError';

describe('PageError', () => {
  const tree = (props?: Partial<PageErrorProps>) => {
    return render(<PageError {...props} />);
  };

  it('renders', () => {
    tree();
    expect(screen.getByTestId('page-error')).toBeInTheDocument();
  });

  it('renders status code when provided', () => {
    tree({ statusCode: 404 });
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('render default error message', () => {
    tree();
    expect(screen.getByText('Something went wrong. Please try again later.')).toBeInTheDocument();
  });

  it('renders custom error message', () => {
    tree({ errorMessage: 'Custom error message' });
    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });

  it('hides redirect link by default', () => {
    tree();
    expect(screen.queryByRole('link', { name: /this page/i })).not.toBeInTheDocument();
  });

  it('renders redirect link when showRedirect is true', () => {
    tree({ showRedirect: true });
    expect(screen.getByRole('link', { name: /this page/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /this page/i })).toHaveAttribute(
      'href',
      'https://fundjournalism.org/?utm_campaign=404#donate'
    );
  });

  it('does not render redirect link when showRedirect is false', () => {
    tree({ showRedirect: false });
    expect(screen.queryByRole('link', { name: /this page/i })).not.toBeInTheDocument();
  });
});
