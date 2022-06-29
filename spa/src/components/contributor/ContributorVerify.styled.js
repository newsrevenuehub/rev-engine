import styled from 'styled-components';

export const ContributorVerify = styled.main`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6rem 2rem;
  background: ${(props) => props.theme.colors.cstm_mainBackground};
  p {
    font-family: ${(props) => props.theme.systemFont};
  }
`;

export const CouldNotVerify = styled.div``;

export const LoadingVerification = styled.h1``;
