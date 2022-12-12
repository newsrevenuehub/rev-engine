import { ColorPicker } from 'components/base';
import PropTypes, { InferProps } from 'prop-types';
import { FormControlLabel } from './LabeledColorPicker.styles';

const LabeledColorPickerPropTypes = {
  label: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.string.isRequired
};

export type LabeledColorPickerProps = InferProps<typeof LabeledColorPickerPropTypes>;

export function LabeledColorPicker({ label, onChange, value }: LabeledColorPickerProps) {
  return (
    <FormControlLabel control={<ColorPicker onChange={onChange} value={value} />} label={label} labelPlacement="top" />
  );
}

LabeledColorPicker.propTypes = LabeledColorPickerPropTypes;
export default LabeledColorPicker;
