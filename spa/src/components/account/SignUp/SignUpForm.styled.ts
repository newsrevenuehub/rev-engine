import { FormHelperText } from '@material-ui/core';
import { TextField } from 'components/base';
import styled from 'styled-components';

export const Root = styled.form`
  display: grid;
  gap: 20px;
`;

export const AgreedError = styled(FormHelperText)`
  && {
    background: rgba(200, 32, 63, 0.16);
    border-radius: ${({ theme }) => theme.muiBorderRadius.sm};
    /* This matches MUI style for TextField. */
    color: #3c3c3c;
    font-size: ${({ theme }) => theme.fontSizesUpdated.xs};
    padding: 4px;
  }
`;

export const EmailField = styled(TextField)`
  && .NreTextFieldInputLabelAsterisk {
    display: none;
  }
`;
