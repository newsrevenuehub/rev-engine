import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import { FormControlLabel } from '../FormControlLabel';
import Radio from '../Radio/Radio';
import RadioGroup from './RadioGroup';

function tree() {
  return render(
    <RadioGroup aria-label="Color">
      <FormControlLabel label="Red" value="red" control={<Radio />}></FormControlLabel>
    </RadioGroup>
  );
}

describe('RadioGroup', () => {
  it('displays a radio button', () => {
    tree();
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
  });

  it('displays children', () => {
    tree();
    expect(screen.getByRole('radio')).toBeInTheDocument();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
