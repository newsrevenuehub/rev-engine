import { FormatColorFill } from '@material-ui/icons';
import { ChangeEvent, FocusEvent, useEffect, useState } from 'react';
import styled, { useTheme } from 'styled-components';
import { hex } from 'wcag-contrast';
import { TextField } from '../TextField/TextField';
import { isHexColor } from 'utilities/isHexColor';
import { StandardTextFieldProps } from '@material-ui/core';

const swatchSize = 40;

const Root = styled.div`
  && {
    .NreTextFieldInput {
      height: 13px; /* equates to 40px total height */
    }
  }
`;

const SwatchRoot = styled.div`
  flex-shrink: 0;
  height: ${swatchSize}px;
  margin-right: 20px;
  position: relative;
  width: ${swatchSize}px;
`;

const Swatch = styled.div`
  && {
    align-items: center;
    border: 1px solid #${({ theme }) => theme.colors.muiGrey[100]};
    border-radius: ${({ theme }) => theme.muiBorderRadius.lg};
    display: flex;
    height: 100%;
    justify-content: center;
    left: 0;
    pointer-events: none;
    position: absolute;
    width: 100%;
    z-index: 1;

    /*
    The base icon has a fill line we don't want to display. We need to adjust the
    icon slightly to keep it vertically centered.
    */

    svg {
      position: relative;
      top: 3px;

      path:nth-child(2) {
        display: none;
      }
    }
  }
`;

const SwatchInput = styled.input`
  appearance: none;
  border: none;
  cursor: pointer;
  height: 100%;
  left: 0;
  position: absolute;
  top: 0;
  width: 100%;

  &:focus {
    outline: 2px solid rgb(0, 191, 223);
  }
`;

const SwatchInputLabel = styled.label`
  /* Hide it visually. */
  opacity: 0;
  pointer-events: none;
  position: absolute;
`;

export interface ColorPickerProps extends Omit<StandardTextFieldProps, 'onChange'> {
  onChange?: (value: string) => void;
}

export function ColorPicker({ onChange, ...other }: ColorPickerProps) {
  const { colors } = useTheme();

  // It's possible for value to be an invalid color. We want the swatch to
  // reflect the last valid color the field has had, and if it's never had a
  // valid color, fall back to a neutral gray.

  const [lastValidColor, setLastValidColor] = useState(
    typeof other.value == 'string' && isHexColor(other.value) ? other.value : colors.muiGrey[300]
  );

  useEffect(() => {
    if (typeof other.value == 'string' && isHexColor(other.value)) {
      setLastValidColor(other.value);
    }
  }, [other.value]);

  // Choose the swatch icon color that offers the most contrast on the swatch
  // color.

  const swatchIconColor = [colors.white, colors.muiGrey[900]].reduce(
    (result, current) => {
      const contrast = hex(current, lastValidColor);

      if (contrast > result.contrast) {
        return { contrast, color: current };
      }

      return result;
    },
    { color: '', contrast: 0 }
  );

  function handleInputBlur(event: FocusEvent<HTMLInputElement>) {
    // Revert to the last valid value if the current value isn't valid.

    if (onChange && !isHexColor(event.target.value)) {
      onChange(lastValidColor);
    }
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    if (!onChange) {
      return;
    }

    // Mask out invalid characters.

    onChange(event.target.value.replace(/[^#\da-f]/gi, ''));
  }

  return (
    <Root>
      <TextField
        {...other}
        onChange={handleInputChange}
        inputProps={{ ...other.inputProps, className: 'NreTextFieldInput', maxLength: 7 }}
        InputProps={{
          classes: { root: 'NreTextFieldInputRoot', underline: 'NreTextFieldInputUnderline' },
          onBlur: handleInputBlur,
          startAdornment: (
            <SwatchRoot>
              <SwatchInputLabel htmlFor={`${other.id}-swatch-input`}>{other.label}</SwatchInputLabel>
              <SwatchInput
                data-testid="swatch-input"
                id={`${other.id}-swatch-input`}
                type="color"
                onChange={handleInputChange}
                value={lastValidColor}
              />
              <Swatch style={{ backgroundColor: lastValidColor, color: swatchIconColor.color }}>
                <FormatColorFill />
              </Swatch>
            </SwatchRoot>
          )
        }}
        variant="standard"
      />
    </Root>
  );
}

export default ColorPicker;
