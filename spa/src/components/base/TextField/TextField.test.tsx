import { act, render, screen } from 'test-utils';
import { axe } from 'jest-axe';
import TextField, { TextFieldProps } from './TextField';

function tree(props?: TextFieldProps) {
  return render(<TextField id="mock-label" label="mock-label" {...props} />);
}

describe('TextField', () => {
  afterEach(async () => await act(() => Promise.resolve()));

  it('displays a text input', async () => {
    tree();
    expect(screen.getByRole('textbox')).toBeVisible();
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
