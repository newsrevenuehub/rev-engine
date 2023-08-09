import { TableCell as MuiTableCell, TableCellProps as MuiTableCellProps } from '@material-ui/core';
import styled from 'styled-components';

export const TableCell = styled(MuiTableCell)`
  && {
    border: none;
    font:
      16px Roboto,
      sans-serif;
  }
`;

export type TableCellProps = MuiTableCellProps;
export default TableCell;
