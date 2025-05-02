import styled from 'styled-components';

export const Root = styled.div`
  align-items: center;
  background-color: ${({ theme }) => theme.basePalette.greyscale['10']};
  color: ${({ theme }) => theme.basePalette.greyscale['70']};
  display: flex;
  font-size: ${({ theme }) => theme.fontSizesUpdated.md};
  font-style: italic;
  height: 175px;
  justify-content: center;
`;
