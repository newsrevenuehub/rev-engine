import { Pagination as MuiPagination, PaginationProps as MuiPaginationProps } from '@material-ui/lab';
import styled from 'styled-components';

export const Pagination = styled(MuiPagination)`
  && {
    align-items: center;
    display: flex;
    justify-content: center;

    button.Mui-selected {
      background-color: #6fd1ec;
      border-radius: 4px;
      font-weight: 700;
    }
  }
`;

export type PaginationProps = MuiPaginationProps;
export default Pagination;
