import { ColorPickerProps } from '../ColorPicker';

export function ColorPicker({ onChange, label, value }: ColorPickerProps) {
  return (
    <div data-testid="color-picker">
      <button onClick={() => onChange?.('mock-color')} data-label={label} data-value={value}>
        color picker {label}
      </button>
    </div>
  );
}

export default ColorPicker;
