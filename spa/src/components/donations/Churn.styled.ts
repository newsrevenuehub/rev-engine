import styled from 'styled-components';

export const Heading = styled.h2`
  font-size: ${({ theme }) => theme.fontSizesUpdated.lgx};
`;

export const Legend = styled.p`
  color: ${({ theme }) => theme.basePalette.greyscale.grey1};
  font-size: ${({ theme }) => theme.fontSizesUpdated.md};
`;
