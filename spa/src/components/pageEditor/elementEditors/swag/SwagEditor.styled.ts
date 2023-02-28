import { FormControlLabel, TextField } from 'components/base';
import styled from 'styled-components';

export const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: 45px;
`;

export const Checkboxes = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

export const CheckboxFieldLabel = styled(FormControlLabel)`
  && {
    display: block;

    .NreFormControlLabelLabel {
      font-size: 14px;
    }
  }
`;

export const Error = styled.p`
  color: ${({ theme }) => theme.colors.error.primary};
`;

export const SwagNameField = styled(TextField)`
  && {
    margin-bottom: 10px;

    .NreTextFieldInputLabelFormControl {
      margin-top: 0;
    }
  }
`;

export const ThresholdFieldAdornment = styled.span`
  color: ${({ theme }) => theme.colors.muiGrey[600]};
  font-weight: 600;
`;

export const ThresholdField = styled(TextField)`
  && {
    .NreTextFieldInputUnderline {
      border: 1px solid ${({ theme }) => theme.colors.muiGrey[400]};
      border-radius: ${({ theme }) => theme.muiBorderRadius.md};
      padding: 4px 12px;
      width: 200px;
    }

    .NreTextFieldInput {
      border: none;
      /* Remove arrow from input type="number" in Chrome, Safari, Edge, Opera */
      &::-webkit-outer-spin-button,
      &::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
    }
  }
`;
