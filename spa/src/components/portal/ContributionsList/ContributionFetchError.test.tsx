import { axe } from 'jest-axe';
import { fireEvent, render, screen } from 'test-utils';
import ContributionFetchError, { ContributionFetchErrorProps } from './ContributionFetchError';

function tree(props?: Partial<ContributionFetchErrorProps>) {
  return render(<ContributionFetchError message="mock-message" onRetry={jest.fn()} {...props} />);
}

describe('ContributionFetchError', () => {
  it('shows an error message', () => {
    tree();
    expect(screen.getByText('mock-message')).toBeInTheDocument();
  });

  it('shows a button that calls onRetry when clicked', () => {
    const onRetry = jest.fn();

    tree({ onRetry });
    expect(onRetry).not.toBeCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
    expect(onRetry).toBeCalledTimes(1);
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
