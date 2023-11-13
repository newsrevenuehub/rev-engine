import styled from 'styled-components';

export const List = styled.div`
  display: grid;
  gap: 12px;
`;

export const Root = styled.div`
  background-color: ${({ theme }) => theme.basePalette.greyscale.grey4};
`;

export const Columns = styled.div`
  display: grid;
  gap: 40px;
  grid-template-columns: 1fr 1fr;
  margin: 0 auto;
  padding: 40px;
  max-width: 1600px;
`;

export const MainContent = styled.div``;

export const Subhead = styled.h2`
  font-size: ${({ theme }) => theme.fontSizesUpdated.lg};
`;

export const Description = styled.p`
  font-size: ${({ theme }) => theme.fontSizesUpdated.md};
`;
