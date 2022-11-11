import { TableRow as MuiTableRow, TableRowProps as MuiTableRowProps } from '@material-ui/core';
import styled from 'styled-components';

export const TableRow = styled(MuiTableRow)`
  && {
    border: none;
  }

  &&:hover,
  &&:nth-child(odd):hover {
    background-color: #bcd3f5;
  }

  &&:nth-child(odd) {
    background-color: #f1f1f1;
  }
`;

export type TableRowProps = MuiTableRowProps;
export default TableRow;
