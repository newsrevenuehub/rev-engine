import styled from 'styled-components';

export const Root = styled.div`
  align-items: center;
  background-color: ${({ theme }) => theme.basePalette.greyscale.grey3};
  color: ${({ theme }) => theme.basePalette.greyscale.grey1};
  display: flex;
  font-size: ${({ theme }) => theme.fontSizesUpdated.md};
  font-style: italic;
  height: 175px;
  justify-content: center;
`;
