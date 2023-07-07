import { Button as MuiButton } from '@material-ui/core';
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
    fill: ${(props) => props.theme.basePalette.greyscale.grey3};

    svg {
      width: 16px;
      height: 16px;
    }
  }
`;

export const TextField = styled(BaseTextField)`
  && {
    input[type='text'] {
      background-color: #3d2947;
      border-color: ${({ theme }) => theme.basePalette.greyscale.white};
      color: ${({ theme }) => theme.basePalette.greyscale.white};
      height: 8px; /* works out to 34px total with padding */
      margin-right: 14px;
      width: 400px;

      /* Force the border to remain white when focused. */

      &:focus {
        border-color: ${({ theme }) => theme.basePalette.greyscale.white};
      }

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
