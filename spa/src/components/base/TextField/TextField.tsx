import { TextField as MuiTextField, TextFieldProps as MuiTextFieldProps } from '@material-ui/core';
import { KeyboardArrowDown } from '@material-ui/icons';
import { forwardRef } from 'react';
import styled from 'styled-components';

const StyledMuiTextField = styled(MuiTextField)`
  && {
    .NreTextFieldFormHelperTextRoot {
      margin-top: 4px;

      &.Mui-error {
        background: rgba(200, 32, 63, 0.16);
        border-radius: 2px;
        color: rgb(60, 60, 60);
        font-size: 12px;
        padding: 4px;
      }
    }

    .NreTextFieldInputLabelRoot {
      color: rgb(40, 40, 40);
      font:
        600 16px Roboto,
        sans-serif;
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

    .NreTextFieldInputLabelFormControl {
      margin-top: 6px;
    }

    .NreTextFieldInput {
      border: 1.5px solid rgb(196, 196, 196);
      border-radius: 4px;
      font-size: 16px;
      padding: 12px 16px;
      /* Needed for custom styles */
      background-color: ${({ theme }) => theme.basePalette.greyscale.white}};

      &:focus {
        border-color: rgb(0, 191, 223);
      }
    }

    .NreTextFieldInputRoot {
      margin-top: 6px;

      & ::placeholder {
        font-style: normal;
      }
    }

    .Mui-error .NreTextFieldInput {
      border-color: rgb(200, 32, 63);
    }

    .NreTextFieldSelectIcon {
      right: 4px;
    }

    /* Disable focused state appearance changes. */

    .NreTextFieldInputUnderline::before,
    .NreTextFieldInputUnderline::after {
      display: none;
    }

    .NreTextFieldSelectSelect:focus {
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
    FormHelperTextProps={{ classes: { root: 'NreTextFieldFormHelperTextRoot' } }}
    inputProps={{ className: 'NreTextFieldInput' }}
    // any cast here is because MuiTextFieldProps doesn't like the `underline` class, as it is only applicable
    // to certain variants of the component.
    InputProps={{ classes: { root: 'NreTextFieldInputRoot', underline: 'NreTextFieldInputUnderline' } as any }}
    InputLabelProps={{
      classes: {
        asterisk: 'NreTextFieldInputLabelAsterisk',
        formControl: 'NreTextFieldInputLabelFormControl',
        root: 'NreTextFieldInputLabelRoot'
      },
      shrink: true
    }}
    SelectProps={{
      classes: { icon: 'NreTextFieldSelectIcon', select: 'NreTextFieldSelectSelect' },
      IconComponent: KeyboardArrowDown
    }}
    ref={ref}
    variant="standard"
    {...props}
  />
));

export default TextField;
