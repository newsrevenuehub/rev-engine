import styled from 'styled-components';

export const ContributorVerifyWrapper = styled.main`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6rem 2rem;
  background: ${(props) => props.theme.colors.cstm_mainBackground};
  p {
    font-family: ${(props) => props.theme.systemFont};
  }
`;
