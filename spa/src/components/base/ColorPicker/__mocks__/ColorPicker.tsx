import { ColorPickerProps } from '../ColorPicker';

export function ColorPicker({ onChange, label, value }: ColorPickerProps) {
  return (
    <div data-testid="color-picker">
      <label id={`color-picker-${label?.toString().replace(/ /g, '')}`}>{label}</label>
      <input defaultValue={value as string} aria-labelledby={`color-picker-${label?.toString().replace(/ /g, '')}`} />
      <button onClick={() => onChange?.('mock-color')}>color picker {label}</button>
    </div>
  );
}

export default ColorPicker;
