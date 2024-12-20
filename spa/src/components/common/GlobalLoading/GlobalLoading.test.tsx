import { axe } from 'jest-axe';
import { act, render, screen } from 'test-utils';
import GlobalLoading, { GlobalLoadingProps } from './GlobalLoading';

jest.mock('components/base/CircularProgress/CircularProgress', () => ({
  CircularProgress: () => <div data-testid="mock-circular-progress" />
}));

function tree(props?: Partial<GlobalLoadingProps>) {
  return render(<GlobalLoading {...props} />);
}

describe('GlobalLoading', () => {
  beforeEach(() => {
    const container = document.createElement('div');

    container.setAttribute('id', 'modal-root');
    document.body.appendChild(container);
    jest.useFakeTimers();
  });

  afterEach(() => {
    document.querySelector('#modal-root')?.remove();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('displays a circular progress indicator after a delay', async () => {
    tree({ wait: 1000 });
    expect(screen.queryByTestId('mock-circular-progress')).not.toBeInTheDocument();
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId('mock-circular-progress')).toBeInTheDocument();
  });

  it('is accessible', async () => {
    const { container } = tree({ wait: 0 });

    act(() => {
      jest.advanceTimersByTime(1);
    });
    jest.useRealTimers();
    expect(await axe(container)).toHaveNoViolations();
  });
});
