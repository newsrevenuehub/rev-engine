import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import PhoneTextField, { PhoneTextFieldProps } from './PhoneTextField';

function tree(props?: Partial<PhoneTextFieldProps>) {
  return render(<PhoneTextField id="mock-label" label="mock-label" {...props} />);
}

describe('PhoneTextField', () => {
  it('displays a text input', () => {
    tree();
    expect(screen.getByRole('textbox')).toBeVisible();
  });

  it.each([
    ['US number', '+16195357597', '+1 (619) 535-7597'],
    ['Brazil number', '+5548988009988', '+55 (48) 988009988']
  ])('%s: renders existing formatted phone number', async (_, number, formatted) => {
    const onChange = jest.fn();
    tree({ value: number, onChange });
    expect(screen.getByRole('textbox')).toHaveValue(formatted);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('calls onChange with default number', () => {
    const onChange = jest.fn();
    tree({ onChange });
    expect(onChange).toHaveBeenCalledWith('+1');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
