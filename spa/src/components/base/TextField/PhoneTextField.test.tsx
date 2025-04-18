import { axe } from 'jest-axe';
import { render, screen } from 'test-utils';
import PhoneTextField, { PhoneTextFieldProps } from './PhoneTextField';
import userEvent from '@testing-library/user-event';

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
    ['Brazil number', '+5548988009988', '+55 (48) 98800-9988']
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

  it('calls onChange with typed number', () => {
    const onChange = jest.fn();
    tree({ onChange });
    userEvent.type(screen.getByRole('textbox'), '6195357597');
    expect(onChange).toHaveBeenCalledWith('+16195357597');
  });

  it('opens country select', () => {
    tree();
    userEvent.click(screen.getByRole('button', { name: 'US icon' }));
    expect(screen.getByRole('listbox')).toBeVisible();
  });

  it('changes country', () => {
    const onChange = jest.fn();
    tree({ onChange });
    userEvent.click(screen.getByRole('button', { name: 'US icon' }));
    userEvent.click(screen.getByRole('option', { name: 'Brazil' }));
    expect(onChange).toHaveBeenCalledWith('+55');
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
