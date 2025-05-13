import styled from 'styled-components';
import { TableCell as BaseTableCell, TableHead as BaseTableHead, TableRow as BaseTableRow } from 'components/base';

export const TableCell = styled(BaseTableCell)`
  && {
    font-size: ${({ theme }) => theme.fontSizesUpdated.sm};
    padding: 0;
  }
`;

// Hide the table header from everything but assistive tech. We can't use
// <OffscreenText> here because we can't mix in a <span> or <div> into the table
// structure. Cribbed the styles from what MUI uses for OffscreenText, however.

export const TableHead = styled(BaseTableHead)`
  && {
    height: 1px;
    overflow: hidden;
    position: absolute;
    width: 1px;
  }
`;

export const TableRow = styled(BaseTableRow)`
  && {
    &:nth-child(odd),
    &:nth-child(odd):hover,
    &:hover {
      background: none;
    }
  }
`;

export const EmptyBillingHistory = styled.p`
  color: ${({ theme }) => theme.basePalette.greyscale['70']};
  font-size: ${({ theme }) => theme.fontSizesUpdated.sm};
  font-weight: 400;
  margin: 0;
`;
