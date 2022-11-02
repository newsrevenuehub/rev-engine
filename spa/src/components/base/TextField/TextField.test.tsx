import { TextFieldProps } from '@material-ui/core';
import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import TextField from './TextField';

function tree(props?: Partial<TextFieldProps>) {
  return render(<TextField id="mock-label" label="mock-label" {...props} />);
}

describe('TextField', () => {
  it('displays a text input', () => {
    tree();
    expect(screen.getByRole('textbox')).toBeVisible();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
