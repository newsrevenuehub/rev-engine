import { TextField as MuiTextField, TextFieldProps as MuiTextFieldProps } from '@material-ui/core';
import styled from 'styled-components';

export type TextFieldProps = MuiTextFieldProps;

const StyledMuiTextField = styled(MuiTextField)`
  && {
    .MuiInputLabel-shrink {
      color: rgb(40, 40, 40);
      font: 600 16px Roboto, sans-serif;
      /*
      MUI applies an absolute position and transform to shrink the label, but we
      want it to look normal.
      */
      position: static;
      transform: none;
    }

    .MuiInput-formControl {
      margin-top: 6px;
    }

    .MuiInput-input {
      border: 1px solid rgb(196, 196, 196);
      border-radius: 4px;
      font-size: 14px;
      padding: 12px 16px;
    }

    /* Disable focused state appearance changes. */

    .MuiInput-underline::before,
    .MuiInput-underline::after {
      display: none;
    }
  }
`;

export const TextField = (props: TextFieldProps) => (
  <StyledMuiTextField InputLabelProps={{ shrink: true }} variant="standard" {...props} />
);

export default TextField;
