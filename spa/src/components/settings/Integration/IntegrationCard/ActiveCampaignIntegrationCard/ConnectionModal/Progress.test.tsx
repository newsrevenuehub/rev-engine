import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import Progress, { ProgressProps } from './Progress';

function tree(props?: Partial<ProgressProps>) {
  return render(<Progress currentStep={1} totalSteps={3} {...props} />);
}

describe('Progress', () => {
  it('displays inactive dots for all steps ahead of the current one', () => {
    tree({ currentStep: 1, totalSteps: 4 });
    expect(screen.getAllByTestId('dot-inactive').length).toBe(3);
  });

  it('displays active dots for all steps behind the current one', () => {
    tree({ currentStep: 3, totalSteps: 4 });
    expect(screen.getAllByTestId('dot-active').length).toBe(2);
  });

  it("displays the current step as a number if it's not the last one", () => {
    tree();
    expect(screen.getByTestId('dot-current')).toHaveTextContent('1');
    expect(screen.queryByTestId('dot-current-check')).not.toBeInTheDocument();
  });

  it('displays a check icon if the current step is the last one', () => {
    tree({ currentStep: 4, totalSteps: 4 });
    expect(screen.getByTestId('dot-current')).toHaveTextContent('');
    expect(screen.getByTestId('dot-current-check')).toBeInTheDocument();
  });

  it('sets ARIA attributes correctly', () => {
    tree({ currentStep: 2, totalSteps: 5 });

    const container = screen.getByRole('progressbar');

    expect(container).toHaveAttribute('aria-valuemin', '1');
    expect(container).toHaveAttribute('aria-valuemax', '5');
    expect(container).toHaveAttribute('aria-valuenow', '2');
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
