import { useEffect } from 'react';
import * as S from './PaginatedTable.styled';

// Deps
import { faSort, faSortUp, faSortDown, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { useTable, usePagination, useSortBy } from 'react-table';

// Children
import CircleButton from 'elements/buttons/CircleButton';

function PaginatedTable({ columns, data = [], fetchData, loading, pageCount, totalResults }) {
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    page,
    canPreviousPage,
    canNextPage,
    pageOptions,
    nextPage,
    previousPage,
    // Get the state from the instance
    state: { pageIndex, pageSize, sortBy }
  } = useTable(
    {
      columns,
      data,
      initialState: { pageIndex: 0, pageSize: 10, sortBy: [] }, // Pass our hoisted table state
      manualPagination: true,
      pageCount,
      manualSortBy: true
    },
    useSortBy,
    usePagination
  );
  // Listen for changes in pagination and use the state to fetch our new data
  useEffect(() => {
    fetchData(pageSize, pageIndex + 1, sortBy);
  }, [fetchData, pageIndex, pageSize, sortBy]);

  const getCurrentPageResultIndices = (pageSize, pageIndex, currentPageSize) => {
    const startIndex = pageSize * pageIndex + 1;
    const endIndex = startIndex + currentPageSize - 1;
    return [startIndex, endIndex];
  };

  const [startIndex, endIndex] = getCurrentPageResultIndices(pageSize, pageIndex, data.length);
  return (
    <>
      <S.PaginatedTable data-testid="donations-table" {...getTableProps()}>
        <thead>
          {headerGroups.map((headerGroup) => (
            <tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map((column) => (
                <th
                  data-testid={`donation-header-${column.id}`}
                  {...column.getHeaderProps(column.getSortByToggleProps())}
                >
                  <div>
                    {column.render('Header')}
                    <SortIcon isSorted={column.isSorted} isSortedDesc={column.isSortedDesc} />
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody {...getTableBodyProps()}>
          {page.map((row, i) => {
            prepareRow(row);
            return (
              <tr
                data-testid="donation-row"
                data-donationid={row.original.id}
                data-lastpaymentdate={row.original.last_payment_date}
                data-amount={row.original.amount}
                data-donor={row.original.contributor_email}
                data-status={row.original.status}
                data-flaggeddate={row.original.flagged_date || ''}
                {...row.getRowProps()}
              >
                {row.cells.map((cell) => {
                  return (
                    <td data-testid="donation-cell" data-testcolumnaccessor={cell.column.id} {...cell.getCellProps()}>
                      {cell.render('Cell')}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </S.PaginatedTable>

      <S.Pagination>
        <S.PaginationSection>
          <CircleButton
            data-testid="previous-page"
            onClick={() => previousPage()}
            disabled={!canPreviousPage}
            icon={faChevronLeft}
          />
          <S.Pages>
            Page
            <S.Current data-testid="page-number"> {pageIndex + 1}</S.Current> of
            <S.Total data-testid="page-total"> {pageOptions.length}</S.Total>
          </S.Pages>
          <CircleButton
            data-testid="next-page"
            icon={faChevronRight}
            onClick={() => nextPage()}
            disabled={!canNextPage}
          />
        </S.PaginationSection>

        <S.ResultsSummary>
          {startIndex} - {endIndex} of <span data-testid="total-results">{totalResults} </span>contributions
        </S.ResultsSummary>
      </S.Pagination>
    </>
  );
}

export default PaginatedTable;

function SortIcon({ isSorted, isSortedDesc }) {
  const getIcon = () => {
    if (!isSorted) return faSort;

    return isSortedDesc ? faSortUp : faSortDown;
  };
  return <S.SortIcon icon={getIcon()} />;
}
