import styled from 'styled-components';

export const Root = styled.div`
  align-self: stretch;
  background-color: #f9f9f9;
  padding: 50px;
`;

export const Text = styled.p`
  font-size: ${({ theme }) => theme.fontSizesUpdated.md};
  margin: 1em auto;
  max-width: 630px;
`;
