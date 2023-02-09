import { axe } from 'jest-axe';
import { ChangeEvent, useState } from 'react';
import { fireEvent, render, screen } from 'test-utils';
import { ColorPicker, ColorPickerProps } from './ColorPicker';

// In order to test functionality around the swatch, we need a simple
// implementation of a controlled version of the component.

function ControlledPicker(props?: Partial<ColorPickerProps>) {
  const [value, setValue] = useState(props?.value ?? '');

  function handleChange(value: string) {
    setValue(value);

    if (props?.onChange) {
      props.onChange(value);
    }
  }

  return <ColorPicker {...props} onChange={handleChange} value={value} />;
}

function tree(props?: Partial<ColorPickerProps>, controlled = false) {
  const Component = controlled ? ControlledPicker : ColorPicker;

  return render(<Component id="test" label="Test" onChange={jest.fn()} {...props} />);
}

describe('ColorPicker', () => {
  describe('Its color input', () => {
    it('is set to the value prop', () => {
      tree({ value: '#123abc' });
      expect(screen.getByTestId('swatch-input')).toHaveValue('#123abc');
    });

    it('defaults to #d9d9d9 if value is not set', () => {
      tree();
      expect(screen.getByTestId('swatch-input')).toHaveValue('#d9d9d9');
    });

    it('calls onChange when changed', () => {
      const onChange = jest.fn();

      tree({ onChange }, true);
      expect(onChange).not.toBeCalled();
      fireEvent.change(screen.getByTestId('swatch-input'), { target: { value: '#fff123' } });
      expect(onChange.mock.calls).toEqual([['#fff123']]);
    });

    it('is set to the last valid value when multiple changes occur', () => {
      tree({}, true);

      // These changes happen in the textbox because it appears jsdom normalizes
      // invalid color values on a color input. That is, triggering a change
      // event with value 'no' gets normalized to '#000000'.

      fireEvent.change(screen.getByRole('textbox'), { target: { value: '#fff123' } });
      expect(screen.getByTestId('swatch-input')).toHaveValue('#fff123');
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'no' } });
      expect(screen.getByTestId('swatch-input')).toHaveValue('#fff123');
    });
  });

  describe('Its text input', () => {
    it('is set to the value prop', () => {
      tree({ value: '#123abc' });
      expect(screen.getByRole('textbox')).toHaveValue('#123abc');
    });

    it('calls onChange when changed', () => {
      const onChange = jest.fn();

      tree({ onChange });
      expect(onChange).not.toBeCalled();
      fireEvent.change(screen.getByRole('textbox'), { target: { value: '#fff123' } });
      expect(onChange.mock.calls).toEqual([['#fff123']]);
    });

    it('has a maximum length of 7', () => {
      tree();
      expect(screen.getByRole('textbox')).toHaveAttribute('maxlength', '7');
    });

    it('filters out invalid characters when calling onChange', () => {
      const onChange = jest.fn();

      tree({ onChange });
      expect(onChange).not.toBeCalled();
      fireEvent.change(screen.getByRole('textbox'), { target: { value: '#123456789abcdefABCDEF XYZ!' } });
      expect(onChange.mock.calls).toEqual([['#123456789abcdefABCDEF']]);
    });

    it('reverts the value when the field loses focus if the current value is not valid', () => {
      const onChange = jest.fn();

      tree({ onChange }, true);
      fireEvent.change(screen.getByRole('textbox'), { target: { value: '#fff123' } });
      fireEvent.change(screen.getByRole('textbox'), { target: { value: '#111' } });
      fireEvent.blur(screen.getByRole('textbox'));
      expect(onChange).toHaveBeenLastCalledWith('#fff123');
    });
  });

  it('is accessible', async () => {
    const { container } = tree();

    expect(await axe(container)).toHaveNoViolations();
  });
});
