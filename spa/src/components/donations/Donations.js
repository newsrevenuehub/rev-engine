import * as S from './Donations.styled';
import { formatCurrencyAmount, formatDateTime } from './utils';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAlert } from 'react-alert';
import { useTable, usePagination, useSortBy } from 'react-table';

import DashboardSectionGroup from 'components/dashboard/DashboardSectionGroup';
import DashboardSection from 'components/dashboard/DashboardSection';

import { GENERIC_ERROR } from 'constants/textConstants';

// AJAX
import axios from 'ajax/axios';
import { DONATIONS } from 'ajax/endpoints';

export const DEFAULT_RESULTS_ORDERING = [
  { id: 'last_payment_date', desc: true },
  { id: 'modified', desc: true },
  { id: 'amount', desc: false },
  { id: 'contributor_email', desc: false }
];

function DonationsTable({ columns, data, fetchData, loading, pageCount, totalResults }) {
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    page,
    canPreviousPage,
    canNextPage,
    pageOptions,
    gotoPage,
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
      <table data-testid="donations-table" {...getTableProps()}>
        <thead>
          {headerGroups.map((headerGroup) => (
            <tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map((column) => (
                <th
                  data-testid={`donation-header-${column.id}`}
                  {...column.getHeaderProps(column.getSortByToggleProps())}
                >
                  {column.render('Header')}
                  <span>{column.isSorted ? (column.isSortedDesc ? ' 🔽' : ' 🔼') : ''}</span>
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
          <tr>
            {loading ? (
              <td colSpan="10000">Loading...</td>
            ) : (
              <td colSpan="10000">
                Showing {startIndex} - {endIndex} of{' '}
                <span data-testid="total-results">~{totalResults} total results</span>
              </td>
            )}
          </tr>
        </tbody>
      </table>

      <div className="pagination">
        <button data-testid="first-page" onClick={() => gotoPage(0)} disabled={!canPreviousPage}>
          {'<<'}
        </button>{' '}
        <button data-testid="previous-page" onClick={() => previousPage()} disabled={!canPreviousPage}>
          {'<'}
        </button>{' '}
        <button data-testid="next-page" onClick={() => nextPage()} disabled={!canNextPage}>
          {'>'}
        </button>{' '}
        <button data-testid="last-page" onClick={() => gotoPage(pageCount - 1)} disabled={!canNextPage}>
          {'>>'}
        </button>{' '}
        <span>
          Page{' '}
          <strong>
            <span data-testid="page-number">{pageIndex + 1}</span> of{' '}
            <span data-testid="page-total">{pageOptions.length}</span>
          </strong>{' '}
        </span>
        <span>
          | Go to page:{' '}
          <input
            data-testid="go-to-page"
            type="number"
            min="1"
            max={pageOptions.length}
            defaultValue={pageIndex + 1}
            onChange={(e) => {
              const page = e.target.value ? Number(e.target.value) - 1 : 0;
              gotoPage(page);
            }}
            style={{ width: '100px' }}
          />
        </span>
      </div>
    </>
  );
}

function Donations() {
  const columns = useMemo(
    () => [
      {
        Header: 'Payment date',
        accessor: 'last_payment_date',
        Cell: (props) => (props.value ? formatDateTime(props.value) : '---')
      },
      {
        Header: 'Amount',
        accessor: 'amount',
        Cell: (props) => (props.value ? formatCurrencyAmount(props.value) : '---')
      },
      {
        Header: 'Donor',
        accessor: 'contributor_email',
        Cell: (props) => props.value || '---'
      },
      {
        Header: 'Status',
        accessor: 'status',
        Cell: (props) => props.value || '---'
      },
      {
        Header: 'Date flagged',
        accessor: 'flagged_date',
        Cell: (props) => (props.value ? formatDateTime(props.value) : '---')
      }
    ],
    []
  );

  const alert = useAlert();

  // We'll start our table without any data
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageCount, setPageCount] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const convertOrderingToString = (ordering) => {
    return ordering.map((item) => (item.desc ? `-${item.id}` : item.id)).toString();
  };
  const fetchData = useCallback(
    async (pageSize, pageIndex, sortBy) => {
      const ordering = sortBy.length ? sortBy : DEFAULT_RESULTS_ORDERING;
      setLoading(true);
      try {
        const {
          data: { count, results }
        } = await axios.get(DONATIONS, {
          params: { page_size: pageSize, page: pageIndex, ordering: convertOrderingToString(ordering) }
        });
        setData(results);
        setPageCount(Math.ceil(count / pageSize));
        setTotalResults(count);
      } catch (e) {
        alert.error(GENERIC_ERROR);
      } finally {
        setLoading(false);
      }
    },
    [alert]
  );

  return (
    <DashboardSectionGroup data-testid="donations">
      <DashboardSection heading="Donations">
        <S.Donations>
          <DonationsTable
            columns={columns}
            data={data}
            fetchData={fetchData}
            loading={loading}
            pageCount={pageCount}
            totalResults={totalResults}
          />
        </S.Donations>
      </DashboardSection>
    </DashboardSectionGroup>
  );
}

export default Donations;
