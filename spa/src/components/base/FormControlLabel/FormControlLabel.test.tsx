import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import { FormControlLabel, FormControlLabelProps } from '../FormControlLabel';

function tree(props?: Partial<FormControlLabelProps>) {
  return render(<FormControlLabel control={<div data-testid="mock-control" />} label="test" />);
}

describe('FormControlLabel', () => {
  it('displays its control', () => {
    tree();
    expect(screen.getByTestId('mock-control')).toBeInTheDocument();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
