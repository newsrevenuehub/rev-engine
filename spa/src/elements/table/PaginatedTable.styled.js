import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export const PaginatedTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 475px;

  td {
    padding: 2rem;
    min-width: 100px;
  }
`;

export const TH = styled.th`
  padding: 1rem;
  background: ${(props) => props.theme.colors.primary};
  color: ${(props) => props.theme.colors.white};

  div {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
  &:hover {
    background: ${(props) => (props.disableSortBy ? '' : props.theme.colors.primaryLight)};
  }
`;

export const TR = styled.tr`
  background: ${(props) => {
    if (props.expanded) return props.theme.colors.tableRowHover;
    else return props.even ? props.theme.colors.grey[0] : props.theme.colors.paneBackground;
  }};

  min-height: 80px;
  opacity: ${(props) => (props.disabled ? 0.4 : 1)};

  &:hover {
    background: ${(props) => (!props.disabled && props.onClick ? props.theme.colors.tableRowHover : '')};
  }
`;

export const SortIcon = styled(FontAwesomeIcon)`
  margin-left: 1rem;
`;

export const Pagination = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

export const ResultsSummary = styled.p`
  margin: 2rem 0;

  span {
    font-weight: bold;
    color: ${(props) => props.theme.colors.primary};
  }
`;

export const PaginationSection = styled.div``;

export const Chevron = styled(FontAwesomeIcon)``;

export const Pages = styled.p`
  display: inline-block;
  margin: 0 1rem;
`;

export const Current = styled.span`
  color: ${(props) => props.theme.colors.primary};
  font-weight: bold;
`;

export const Total = styled.span``;
