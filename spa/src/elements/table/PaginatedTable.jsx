import { useEffect, useMemo } from 'react';
import * as S from './PaginatedTable.styled';

// Deps
import { faSort, faSortUp, faSortDown } from '@fortawesome/free-solid-svg-icons';
import { useTable, usePagination, useSortBy } from 'react-table';

function PaginatedTable({
  columns,
  data = [],
  fetchData,
  refetch,
  pageCount,
  onRowClick,
  onPageChange,
  getRowIsDisabled,
  defaultSortBy,
  pageIndex: controlledPageIndex
}) {
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    page,
    pageOptions,
    // Get the state from the instance
    state: { pageIndex, pageSize, sortBy }
  } = useTable(
    {
      columns,
      data,
      initialState: { pageIndex: 0, pageSize: 10, sortBy: defaultSortBy || [] }, // Pass our hoisted table state
      manualPagination: true,
      pageCount,
      manualSortBy: true,
      useControlledState: (state) => {
        return useMemo(
          () => ({
            ...state,
            pageIndex: controlledPageIndex
          }),
          // ingore warnings that controlledPageIndex shouldn't be in dependencies. without, new page won't
          // be retrieved when pageIndex changes.
          // eslint-disable-next-line react-hooks/exhaustive-deps
          [state, controlledPageIndex]
        );
      }
    },
    useSortBy,
    usePagination
  );
  // Listen for changes in pagination and use the state to fetch our new data
  useEffect(() => {
    fetchData(pageSize, pageIndex + 1, sortBy);
  }, [fetchData, pageIndex, pageSize, sortBy, refetch]);

  return (
    <>
      <S.TableScrollWrapper>
        <S.PaginatedTable data-testid="donations-table" {...getTableProps()} columns={columns}>
          <thead>
            {headerGroups.map((headerGroup) => (
              <tr {...headerGroup.getHeaderGroupProps()}>
                {headerGroup.headers.map((column) => (
                  <S.TH
                    data-testid={`donation-header-${column.id}`}
                    disableSortBy={column.disableSortBy}
                    {...column.getHeaderProps(column.getSortByToggleProps())}
                    aria-label={column.canSort ? `Sort by ${column.Header}` : ''}
                    title={column.canSort ? `Sort by ${column.Header}` : ''}
                  >
                    <div>
                      {column.render('Header')}
                      <SortIcon
                        isSorted={column.isSorted}
                        isSortedDesc={column.isSortedDesc}
                        disableSortBy={column.disableSortBy}
                      />
                    </div>
                  </S.TH>
                ))}
              </tr>
            ))}
          </thead>
          <tbody {...getTableBodyProps()}>
            {page.map((row, i) => {
              prepareRow(row);
              const disabled = getRowIsDisabled && getRowIsDisabled(row);
              return (
                <S.TR
                  data-testid="donation-row"
                  data-donationid={row.original.id}
                  data-lastpaymentdate={row.original.last_payment_date}
                  data-amount={row.original.amount}
                  data-donor={row.original.contributor_email}
                  data-status={row.original.status}
                  data-flaggeddate={row.original.flagged_date || ''}
                  // revenue_program.name should always be present on actual data
                  // but using null coalescing operator here so don't have to
                  // add `revenue_program: {name: 'foo'}` in `data` in `PaginatedTable.test.js`.
                  data-revenueprogram={row.original.revenue_program?.name ?? ''}
                  onClick={() => (onRowClick ? onRowClick(row.original) : {})}
                  even={i === 0 || i % 2 === 0}
                  disabled={disabled}
                  {...row.getRowProps()}
                >
                  {row.cells.map((cell) => {
                    return (
                      <td data-testid="donation-cell" data-testcolumnaccessor={cell.column.id} {...cell.getCellProps()}>
                        {cell.render('Cell')}
                      </td>
                    );
                  })}
                </S.TR>
              );
            })}
          </tbody>
        </S.PaginatedTable>
      </S.TableScrollWrapper>
      {!data.length && <S.EmptyState variant="body1">0 contributions to show.</S.EmptyState>}
      <S.Pagination
        size="small"
        count={pageOptions.length}
        shape="rounded"
        onChange={(_, page) => {
          onPageChange(page - 1);
        }}
      />
    </>
  );
}

export default PaginatedTable;

function SortIcon({ isSorted, isSortedDesc, disableSortBy }) {
  if (disableSortBy) return null;
  const getIcon = () => {
    if (!isSorted) return faSort;

    return isSortedDesc ? faSortUp : faSortDown;
  };
  return <S.SortIcon icon={getIcon()} />;
}
