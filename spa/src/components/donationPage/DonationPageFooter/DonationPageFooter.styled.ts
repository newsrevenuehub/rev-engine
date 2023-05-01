import styled from 'styled-components';

export const Root = styled.footer`
  width: 100%;
  background: ${({ theme }) => theme.colors.white};
  padding: 4rem 0;
  box-shadow: ${({ theme }) => theme.shadows[0]};
  font-family: ${({ theme }) => theme.systemFont};
`;

export const Content = styled.div`
  text-align: center;
  font-size: 12px;

  p {
    margin-top: 1rem;
    font-family: ${({ theme }) => theme.systemFont};
  }
`;
