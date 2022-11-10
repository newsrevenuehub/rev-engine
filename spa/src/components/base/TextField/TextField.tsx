import { TextField as MuiTextField, TextFieldProps as MuiTextFieldProps } from '@material-ui/core';
import { KeyboardArrowDown } from '@material-ui/icons';
import { forwardRef } from 'react';
import styled from 'styled-components';

const StyledMuiTextField = styled(MuiTextField)`
  && {
    [class*='MuiFormHelperText-root'] {
      margin-top: 4px;

      &[class*='Mui-error'] {
        background: rgba(200, 32, 63, 0.16);
        border-radius: 2px;
        color: rgb(60, 60, 60);
        font-size: 12px;
        padding: 4px;
      }
    }

    [class*='MuiInputLabel-shrink'] {
      color: rgb(40, 40, 40);
      font: 600 16px Roboto, sans-serif;
      /*
      MUI applies an absolute position and transform to shrink the label, but we
      want it to look normal.
      */
      position: static;
      transform: none;

      &[class*='Mui-error'] {
        color: rgb(200, 32, 63);
      }
    }

    [class*='MuiInput-formControl'] {
      margin-top: 6px;
    }

    [class*='MuiInput-input'] {
      border: 1.5px solid rgb(196, 196, 196);
      border-radius: 4px;
      font-size: 14px;
      padding: 12px 16px;

      &:focus {
        border-color: rgb(0, 191, 223);
      }
    }

    [class*='Mui-error'] [class*='MuiInput-input'] {
      border-color: rgb(200, 32, 63);
    }

    [class*='MuiSelect-icon'] {
      right: 4px;
    }

    /* Disable focused state appearance changes. */

    [class*='MuiInput-underline']::before,
    [class*='MuiInput-underline']::after {
      display: none;
    }

    [class*='MuiSelect-select']:focus {
      background: none;
    }
  }
`;

export type TextFieldProps = MuiTextFieldProps;

/**
 * @see https://v4.mui.com/api/text-field/
 */
export const TextField = forwardRef<HTMLDivElement, TextFieldProps>((props, ref) => (
  <StyledMuiTextField
    InputLabelProps={{ shrink: true }}
    SelectProps={{
      IconComponent: KeyboardArrowDown
    }}
    ref={ref}
    variant="standard"
    {...props}
  />
));

export default TextField;
