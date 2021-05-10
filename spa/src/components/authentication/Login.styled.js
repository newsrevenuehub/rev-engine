import styled from 'styled-components';

export const Login = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;

  background: rgb(12, 192, 221);
  background: linear-gradient(135deg, rgba(12, 192, 221, 1) 20%, rgba(199, 239, 247, 1) 95%);
`;

export const LoginCard = styled.section`
  margin-top: 10rem;
  padding: 4rem;
  background: ${(p) => p.theme.colors.white};
  max-width: 450px;
  width: 100%;
  box-shadow: ${(p) => p.theme.shadows[1]};
  border-radius: ${(p) => p.theme.radii[1]};
`;

export const LoginForm = styled.form``;

export const InputWrapper = styled.div`
  &:not(:last-of-type) {
    margin-bottom: 2rem;
  }
`;

export const LoginButtons = styled.div`
  margin-top: 4rem;
  display: flex;
  justify-content: flex-end;
`;

export const LoginButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
`;
