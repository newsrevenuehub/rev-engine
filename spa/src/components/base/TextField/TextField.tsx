import { TextField as MuiTextField, TextFieldProps as MuiTextFieldProps } from '@material-ui/core';
import { KeyboardArrowDown } from '@material-ui/icons';
import { ForwardedRef, forwardRef } from 'react';
import styled from 'styled-components';

export type TextFieldProps = MuiTextFieldProps;

const StyledMuiTextField = styled(MuiTextField)`
  && {
    .MuiFormHelperText-root {
      margin-top: 4px;

      &.Mui-error {
        background: rgba(200, 32, 63, 0.16);
        border-radius: 2px;
        color: rgb(60, 60, 60);
        font-size: 12px;
        padding: 4px;
      }
    }

    .MuiInputLabel-shrink {
      color: rgb(40, 40, 40);
      font: 600 16px Roboto, sans-serif;
      /*
      MUI applies an absolute position and transform to shrink the label, but we
      want it to look normal.
      */
      position: static;
      transform: none;

      &.Mui-error {
        color: rgb(200, 32, 63);
      }
    }

    .MuiInput-formControl {
      margin-top: 6px;
    }

    .MuiInput-input {
      border: 1.5px solid rgb(196, 196, 196);
      border-radius: 4px;
      font-size: 14px;
      padding: 12px 16px;

      &:focus {
        border-color: rgb(0, 191, 223);
      }
    }

    .Mui-error .MuiInput-input {
      border-color: rgb(200, 32, 63);
    }

    .MuiSelect-icon {
      right: 4px;
    }

    /* Disable focused state appearance changes. */

    .MuiInput-underline::before,
    .MuiInput-underline::after {
      display: none;
    }

    .MuiSelect-select:focus {
      background: none;
    }
  }
`;

export const TextField = forwardRef((props: TextFieldProps, ref: ForwardedRef<HTMLDivElement>) => (
  <StyledMuiTextField
    InputLabelProps={{ shrink: true }}
    SelectProps={{
      native: true,
      IconComponent: KeyboardArrowDown
    }}
    ref={ref}
    variant="standard"
    {...props}
  />
));

export default TextField;
