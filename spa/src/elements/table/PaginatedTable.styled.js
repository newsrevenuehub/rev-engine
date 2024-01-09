import styled, { css } from 'styled-components';
import { Pagination as MuiPagination } from '@material-ui/lab';
import { Typography } from '@material-ui/core';

export const TableScrollWrapper = styled.div`
  width: 100%;
  overflow-x: scroll;
`;

export const PaginatedTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-family: ${(props) => props.theme.systemFont};
  td {
    padding: 1rem;
    min-width: 100px;
  }

  /* ...I don't wanna talk about it... */
  @media (${(props) => props.theme.breakpoints.phoneOnly}) {
    &,
    thead,
    tbody,
    th,
    td,
    tr {
      display: block;
    }

    /* Hide table headers (but not display: none;, for accessibility) */
    thead tr {
      position: absolute;
      top: -9999px;
      left: -9999px;
    }

    tr {
      border: 1px solid #ccc;
    }

    td {
      /* Behave  like a "row" */
      border: none;
      border-bottom: 1px solid ${(props) => props.theme.colors.grey[1]};
      position: relative;
      padding-left: 115px;
      word-break: break-all;
      height: 70px;
      display: flex;
      flex-direction: row;
      align-items: center;
    }

    td:before {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      left: 6px;
      width: 100px;
      white-space: wrap;
      word-break: break-word;
    }

    /* Hacking the headers */
    ${(props) =>
      props.columns.map(
        (column, i) => css`
          td:nth-of-type(${i + 1}):before {
            content: '${column.Header}';
          }
        `
      )}
  }
`;

export const TH = styled.th`
  padding: 1rem;
  font-size: ${(props) => props.theme.fontSizesUpdated.sm};
  background: ${(props) => props.theme.colors.muiLightBlue[200]};
  color: ${(props) => props.theme.colors.muiGrey[900]};

  div {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
  &:hover {
    background: ${(props) =>
      props.disableSortBy ? '' : props.theme.colors.cstm_CTAs || props.theme.colors.primaryLight};
  }
`;

export const TR = styled.tr`
  background: ${(props) => {
    if (props.expanded) return props.theme.colors.tableRowHover;
    else return props.even ? props.theme.colors.muiGrey[100] : props.theme.colors.paneBackground;
  }};

  min-height: 80px;
  opacity: ${(props) => (props.disabled ? 0.4 : 1)};

  &:hover {
    background: ${(props) => (!props.disabled && props.onClick ? props.theme.colors.tableRowHover : '')};
  }
`;

export const SortIcon = styled.span`
  margin-left: 1rem;
`;

export const EmptyState = styled(Typography)`
  font-style: italic;
  font-size: ${(props) => props.theme.fontSizesUpdated.md};
  text-align: center;
`;

export const Pagination = styled(MuiPagination)`
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;

  && .Mui-selected {
    font-weight: 700;
    background-color: ${(props) => props.theme.colors.muiLightBlue[200]};
  }
`;

export const ResultsSummary = styled.p`
  margin: 2rem 0;
  font-family: ${(props) => props.theme.systemFont};
  span {
    font-family: ${(props) => props.theme.systemFont};
    font-weight: bold;
    color: ${(props) => props.theme.colors.cstm_CTAs || props.theme.colors.primary};
  }
`;

export const PaginationSection = styled.div``;

export const Pages = styled.p`
  display: inline-block;
  margin: 0 1rem;
  font-family: ${(props) => props.theme.systemFont};
`;

export const Current = styled.span`
  color: ${(props) => props.theme.colors.cstm_CTAs || props.theme.colors.primary};
  font-weight: bold;
`;

export const Total = styled.span``;
