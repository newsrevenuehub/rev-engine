import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import CircularProgress, { CircularProgressProps } from './CircularProgress';

function tree(props?: Partial<CircularProgressProps>) {
  return render(<CircularProgress aria-label="Loading" {...props} />);
}

describe('CircularProgress', () => {
  it('displays a progress bar', () => {
    tree();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
