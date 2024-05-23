import { TextField } from 'components/base';
import styled from 'styled-components';

export const EmailField = styled(TextField)`
  && .NreTextFieldInputLabelAsterisk {
    display: none;
  }
`;

export const Root = styled.form`
  display: grid;
  gap: 20px;
`;
