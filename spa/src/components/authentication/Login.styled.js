import styled from 'styled-components';

export const Login = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

export const LoginCard = styled.section`
  margin-top: 10rem;
  padding: 4rem;
  background: ${(props) => props.theme.colors.white};
  max-width: 450px;
  width: 100%;
  box-shadow: ${(props) => props.theme.shadows[1]};
  border-radius: ${(props) => props.theme.radii[1]};
`;

export const Message = styled.p`
  padding: 1rem 0;
`;

export const LoginForm = styled.form``;

export const InputWrapper = styled.div`
  &:not(:last-of-type) {
    margin-bottom: 2rem;
  }
`;

export const LoginButtons = styled.div`
  margin-top: 2rem;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
`;

export const LoginButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  margin-bottom: 1rem;
`;

export const ForgotPasswordLink = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  text-decoration: underline;
`;
