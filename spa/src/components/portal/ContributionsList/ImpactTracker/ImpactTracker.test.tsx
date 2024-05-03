import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import ImpactTracker, { ImpactTrackerProps } from './ImpactTracker';

const impact = {
  total: 123000
} as any;

function tree(props?: Partial<ImpactTrackerProps>) {
  return render(<ImpactTracker impact={impact} {...props} />);
}

describe('ImpactTracker', () => {
  it('shows the total amount', () => {
    tree();
    expect(screen.getByText('$1,230.00')).toBeVisible();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
