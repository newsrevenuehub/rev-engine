import { Link, TextField } from 'components/base';
import styled from 'styled-components';

// This is needed because we're using the `component` prop on Link to make it a
// react-router-link, which causes TS issues.
const LooseLink = Link as any;

export const EmailField = styled(TextField)`
  && .NreTextFieldInputLabelAsterisk {
    display: none;
  }
`;

export const ForgotPasswordLink = styled(LooseLink)`
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
