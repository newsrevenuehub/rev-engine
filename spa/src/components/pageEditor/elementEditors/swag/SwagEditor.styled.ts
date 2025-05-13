import { InputAdornment as MuiInputAdornment } from '@material-ui/core';
import { TextField } from 'components/base';
import styled from 'styled-components';

export const EndInputAdornment = styled(MuiInputAdornment)`
  && {
    position: absolute;
    right: 12px;
  }

  span {
    color: ${({ theme }) => theme.basePalette.greyscale['70']};
    font-weight: 600;
  }
`;

export const Prompt = styled.p`
  font-size: 16px;
`;

export const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: 45px;
`;

export const StartInputAdornment = styled(MuiInputAdornment)`
  && {
    position: absolute;
    left: 8px;
  }

  span {
    color: ${({ theme }) => theme.basePalette.greyscale['70']};
    font-weight: 600;
  }
`;

export const ThresholdTextField = styled(TextField)`
  && {
    width: 200px;

    && input {
      padding-left: 20px;
      padding-right: 50px;

      /* Hide spinner controls. */

      appearance: textfield;

      ::-webkit-inner-spin-button,
      ::-webkit-outer-spin-button {
        display: none;
        margin: 0;
      }
    }
  }
`;
