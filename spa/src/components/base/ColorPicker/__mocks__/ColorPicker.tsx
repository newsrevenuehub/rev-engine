import { ColorPickerProps } from '../ColorPicker';

export function ColorPicker({ onChange, label, value }: ColorPickerProps) {
  return (
    <div data-testid="color-picker" data-label={label} data-value={value}>
      <button onClick={() => onChange?.('mock-color')}>color picker {label}</button>
    </div>
  );
}

export default ColorPicker;
