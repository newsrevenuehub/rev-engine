import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import { FormControlLabel } from '../FormControlLabel';
import Radio, { RadioProps } from './Radio';

function tree(props?: Partial<RadioProps>) {
  return render(<FormControlLabel control={<Radio {...props} />} label="test" />);
}

describe('Radio', () => {
  it('displays a radio button', () => {
    tree();
    expect(screen.getByRole('radio')).toBeInTheDocument();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
