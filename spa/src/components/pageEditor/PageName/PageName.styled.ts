import { Button as MuiButton, InputAdornment as MuiInputAdornment } from '@material-ui/core';
import { TextField as BaseTextField } from 'components/base';
import styled from 'styled-components';

export const Label = styled.span`
  padding-right: 20px;
`;

export const Form = styled.form`
  display: flex;
  align-items: center;
  margin-bottom: 0;
`;

export const Button = styled(MuiButton)`
  && {
    color: ${({ theme }) => theme.basePalette.greyscale.white};
    /* Undo default styling. */
    font-size: 100%;
    height: 100%;
    letter-spacing: 0;
    text-transform: none;
  }
`;

export const IconWrapper = styled.span`
  && {
    display: flex;
    margin-right: 6px;
    min-width: unset;
    fill: ${(props) => props.theme.basePalette.greyscale['10']};

    svg {
      width: 16px;
      height: 16px;
    }
  }
`;

export const InputAdornment = styled(MuiInputAdornment)`
  && {
    margin-right: unset;
    margin-left: -2.5px;
  }
`;

export const TextField = styled(BaseTextField)`
  && {
    border: 1.5px solid ${({ theme }) => theme.basePalette.greyscale.white};
    border-radius: 4px;
    padding: 5px 10px;
    font-size: 14px;
    background-color: #3d2947;
    margin-right: 14px;
    width: 400px;

    .NreTextFieldInput {
      background-color: #3d2947;
      border: none;
      color: ${({ theme }) => theme.basePalette.greyscale.white};
      height: 0; /* works out to 34px total with padding */

      &::selection {
        background-color: rgba(255, 255, 255, 0.8);
        color: #523a5e;
      }
    }

    .NreTextFieldInputLabelFormControl,
    .NreTextFieldInputUnderline {
      margin: 0;
    }
  }
`;
