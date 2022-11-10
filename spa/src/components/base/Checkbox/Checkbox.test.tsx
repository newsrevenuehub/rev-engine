import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import { FormControlLabel } from '../FormControlLabel';
import Checkbox, { CheckboxProps } from './Checkbox';

function tree(props?: Partial<CheckboxProps>) {
  return render(<FormControlLabel control={<Checkbox {...props} />} label="test" />);
}

describe('Checkbox', () => {
  it('displays a checkbox', () => {
    tree();
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
