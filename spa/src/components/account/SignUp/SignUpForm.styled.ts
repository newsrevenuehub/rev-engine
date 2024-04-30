import { TextField } from 'components/base';
import styled from 'styled-components';

export const Root = styled.form`
  display: grid;
  gap: 20px;
`;

export const EmailField = styled(TextField)`
  && .NreTextFieldInputLabelAsterisk {
    display: none;
  }
`;
