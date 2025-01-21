import styled from 'styled-components';
// Using the MUI core radio controls to match appearance in DFrequency.
import { FormControlLabel as MuiFormControlLabel, Radio as MuiRadio } from '@material-ui/core';
import { Checkbox as BaseCheckbox, TextField as BaseTextField } from 'components/base';

export const Prompt = styled.p`
  font-size: ${({ theme }) => theme.fontSizesUpdated.md};
  font-weight: 500;
  margin-bottom: 6px;
  padding-top: 25px;
`;

export const Checkbox = styled(BaseCheckbox)`
  && {
    &.Mui-checked {
      color: ${({ theme }) => theme.colors.cstm_CTAs};
    }
  }
`;

export const Radio = styled(MuiRadio)``;

export const RadioFormControlLabel = styled(MuiFormControlLabel)`
  && span {
    font-size: ${({ theme }) => theme.fontSizesUpdated.md};
  }
`;

export const Root = styled.div`
  display: grid;
  gap: 25px;
`;

export const TextField = styled(BaseTextField)`
  && {
    .NreTextFieldInput {
      background: ${({ theme }) => theme.colors.cstm_inputBackground};
      border-color: ${({ theme }) => theme.colors.cstm_inputBorder};
      border-width: 1px;

      &:focus {
        border-color: ${({ theme }) => theme.colors.cstm_CTAs};
        /* Imitate the outline border on text fields in the name section. */
        box-shadow: inset 0 0 0 1px ${({ theme }) => theme.colors.cstm_CTAs};
      }
    }

    .NreTextFieldInputLabelFormControl {
      margin-top: 0;
    }

    .NreTextFieldInputLabelAsterisk {
      color: #ff476c;
    }
  }
`;
