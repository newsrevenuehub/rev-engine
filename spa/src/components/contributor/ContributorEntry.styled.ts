import styled from 'styled-components';

import Button from 'elements/buttons/Button';

export const ContributorEntry = styled.main`
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  background: ${(props) => props.theme.colors.cstm_mainBackground};
`;

export const ContentWrapper = styled.section`
  margin-top: 4rem;
  padding: 2rem;
  max-width: 600px;
`;

export const Title = styled.h1`
  text-align: center;
  font-family: ${(props) => props.theme.font.heading};
`;

export const EmailForm = styled.form``;

export const InputWrapper = styled.div`
  margin: 2rem 0;

  input {
    font-family: ${(props) => props.theme.systemFont};
  }
`;

export const NoSuchContributor = styled.div`
  display: flex;
  flex-direction: row;
  padding: 0 1rem;
  margin: 2rem 0;

  p {
    flex: 1;
    margin-left: 1rem;
  }
`;

export const MagicLinkButton = styled(Button)`
  span {
    margin-left: 1rem;
    font-size: 32px;
  }
  font-family: ${(props) => props.theme.systemFont};
`;

export const Confirmation = styled.div`
  margin-top: 4rem;
  p {
    max-width: 400px;
    margin: 1rem auto;
    font-family: ${(props) => props.theme.systemFont};
  }
`;
