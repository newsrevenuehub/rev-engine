import { StepperDots, StepperDotsProps } from './StepperDots';
import { render, screen } from 'test-utils';
import { axe } from 'jest-axe';

function tree(props?: Partial<StepperDotsProps>) {
  return render(<StepperDots activeStep={0} steps={2} {...props} />);
}

describe('StepperDots', () => {
  it('uses the ARIA label passed', () => {
    tree({ 'aria-label': '2 of 3 steps' });
    expect(screen.getByLabelText('2 of 3 steps')).toBeInTheDocument();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
