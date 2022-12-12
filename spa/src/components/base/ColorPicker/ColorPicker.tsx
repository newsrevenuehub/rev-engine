import { ChangeEvent } from 'react';
import PropTypes, { InferProps } from 'prop-types';
import styled from 'styled-components';

const ColorPickerPropTypes = {
  id: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.string.isRequired
};

export interface ColorPickerProps extends InferProps<typeof ColorPickerPropTypes> {
  onChange: (event: ChangeEvent) => void;
}

// The general approach on styling is to turn the native input into an empty
// container (hiding the swatch it would normally render), then render the
// swatch and label on top of that. Trying to style the native swatch
// consistently is difficult because each browser takes a different approach.

const Root = styled.div`
  height: 45px;
  position: relative;
  width: 200px;
`;

const ColorInput = styled.input`
  appearance: none;
  background: none;
  border: 1px solid ${({ theme }) => theme.colors.inputBorder};
  cursor: pointer;
  height: 100%;
  left: 0;
  position: absolute;
  top: 0;
  width: 100%;

  &:focus {
    border: 1px solid ${({ theme }) => theme.colors.primary};
    outline: none;
  }

  &::-moz-color-swatch {
    display: none;
  }

  &::-webkit-color-swatch {
    display: none;
  }
`;

const Swatch = styled.div`
  pointer-events: none;
  position: absolute;
  /* Leaving room for the border of the enclosing input. */
  top: 1px;
  left: 1px;
  width: 30px;
  bottom: 1px;
`;

const ValueLabel = styled.div`
  align-items: center;
  display: grid;
  font-size: 16px;
  font-weight: 200;
  justify-content: center;
  pointer-events: none;
  position: absolute;
  top: 0;
  left: 30px;
  right: 0;
  bottom: 0;
`;

export function ColorPicker({ id, onChange, value }: ColorPickerProps) {
  return (
    <Root>
      <ColorInput id={id!} type="color" onChange={onChange} value={value} />
      <Swatch style={{ backgroundColor: value }} />
      {/* Hidden because screen readers will announce the value, so this would be redundant. */}
      <ValueLabel aria-hidden>{value}</ValueLabel>
    </Root>
  );
}

ColorPicker.propTypes = ColorPickerPropTypes;
export default ColorPicker;
