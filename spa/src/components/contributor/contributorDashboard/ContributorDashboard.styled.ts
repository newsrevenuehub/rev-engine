import styled from 'styled-components';

export const Root = styled.main`
  height: 100%;
  display: flex;
  flex-direction: column;
  font-family: ${(props) => props.theme.systemFont};
  padding: 3rem 4.5rem;
  gap: 3rem;
  background: ${(props) => props.theme.colors.cstm_mainBackground};
  @media (${(props) => props.theme.breakpoints.phoneOnly}) {
    padding: 1.5rem 1rem;
  }
`;
