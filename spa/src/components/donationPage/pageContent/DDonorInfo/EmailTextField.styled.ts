import { ButtonBase } from '@material-ui/core';
import { TextField as BaseTextField } from 'components/base';
import styled from 'styled-components';

export const Prompt = styled.span`
  background-color: ${({ theme }) => theme.basePalette.greyscale['10']};
  color: ${({ theme }) => theme.basePalette.greyscale.black};
  display: inline-flex;
  flex-wrap: wrap;
  font-size: ${({ theme }) => theme.fontSizesUpdated.xs};
  min-width: 100%;
  padding: 0 5px;
`;

export const PromptButton = styled(ButtonBase)`
  && {
    color: ${({ theme }) => theme.basePalette.primary.engineBlue};
    font-weight: 500;
    padding: 5px 15px;
  }
`;

export const TextField = styled(BaseTextField)`
  && {
    .NreTextFieldInputLabelFormControl,
    .Mui-error.NreTextFieldInputLabelFormControl {
      color: rgb(40, 40, 40);
      font-weight: 500;
      margin-top: 0;
      margin-bottom: 2px;
    }

    .NreTextFieldInput,
    .Mui-error .NreTextFieldInput {
      background: ${({ theme }) => theme.colors.cstm_inputBackground};
      border: 1px solid #080708;
      border-color: ${({ theme }) => theme.colors.cstm_inputBorder};
      border-radius: 3px;
      height: 19px;

      &:focus {
        border-color: ${({ theme }) => theme.colors.cstm_CTAs};
        /* Imitate the outline border on text fields in the name section. */
        box-shadow: inset 0 0 0 1px ${({ theme }) => theme.colors.cstm_CTAs};
      }
    }

    .NreTextFieldInputLabelAsterisk {
      color: #ff476c;
    }

    .NreTextFieldFormHelperTextRoot.Mui-error {
      font-size: 14px;
      background: none;
      color: rgb(255, 71, 108);
      margin: 0;
      padding: 0;
    }
  }
`;
