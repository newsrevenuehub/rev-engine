import { TableRow as MuiTableRow, TableRowProps as MuiTableRowProps } from '@material-ui/core';
import styled from 'styled-components';

export const TableRow = styled(MuiTableRow)`
  && {
    background-color: ${({ theme }) => theme.basePalette.greyscale.white};
    border: none;
  }

  &&:hover,
  &&:nth-child(odd):hover {
    background-color: ${({ theme }) => theme.colors.tableRowHover};
  }

  &&:nth-child(odd) {
    background-color: ${({ theme }) => theme.basePalette.greyscale['10']};
  }
`;

export type TableRowProps = MuiTableRowProps;
export default TableRow;
