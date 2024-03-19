import { TextField } from 'components/base';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

export const EmailField = styled(TextField)`
  && .NreTextFieldInputLabelAsterisk {
    display: none;
  }
`;

export const ForgotPasswordLink = styled(Link)`
  font-weight: 600;
  position: absolute;
  right: 0;

  /* Align with label text. */
  top: 6px;
`;

export const PasswordContainer = styled.div`
  position: relative;
`;

export const Root = styled.form`
  display: grid;
  gap: 20px;
`;
