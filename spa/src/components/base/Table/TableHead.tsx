import { TableHead as MuiTableHead, TableHeadProps as MuiTableHeadProps } from '@material-ui/core';
import styled from 'styled-components';

export const TableHead = styled(MuiTableHead)`
  && th {
    background-color: #6fd1ec;
    font-size: 14px;
    font-weight: bold;
  }
`;

export type TableHeadProps = MuiTableHeadProps;
export default TableHead;
