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

  it('renders header when provided', () => {
    tree({ header: 'mock-header' });
    expect(screen.getByText('mock-header')).toBeInTheDocument();
  });

  it('render default description', () => {
    tree();
    expect(screen.getByText('Something went wrong. Please try again later.')).toBeInTheDocument();
  });

  it('renders custom description', () => {
    tree({ description: 'Custom error message' });
    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });
});
