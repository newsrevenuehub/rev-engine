import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import LoadingSkeleton from './LoadingSkeleton';

jest.mock('@material-ui/lab', () => ({
  ...jest.requireActual('@material-ui/lab'),
  Skeleton: () => <div data-testid="mock-skeleton" />
}));

function tree() {
  return render(<LoadingSkeleton />);
}

describe('LoadingSkeleton', () => {
  it('should render skeletons for each section', () => {
    tree();
    expect(screen.getAllByTestId('mock-skeleton')).toHaveLength(4);
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
