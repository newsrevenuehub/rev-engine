import React, { useEffect, useMemo } from 'react';
import { useTable, usePagination } from 'react-table';
import styled from 'styled-components';

import DashboardSectionGroup from 'components/dashboard/DashboardSectionGroup';
import DashboardSection from 'components/dashboard/DashboardSection';

// AJAX
import axios from 'ajax/axios';
import { DONATIONS } from 'ajax/endpoints';

function Table({ columns, data, fetchData, loading, pageCount, totalResults }) {
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
    setPageSize,
    // Get the state from the instance
    state: { pageIndex, pageSize }
  } = useTable(
    {
      columns,
      data,
      initialState: { pageIndex: 0, pageSize: 10 }, // Pass our hoisted table state
      manualPagination: true, // Tell the usePagination
      // hook that we'll handle our own data fetching
      // This means we'll also have to provide our own
      // pageCount.
      pageCount
    },
    usePagination
  );

  // Listen for changes in pagination and use the state to fetch our new data
  useEffect(() => {
    fetchData(pageSize, pageIndex + 1);
  }, [pageIndex, pageSize, totalResults]);

  // memoize this?
  const getCurrentPageResultIndices = (pageSize, pageIndex, currentPageSize) => {
    const startIndex = pageSize * pageIndex + 1;
    const endIndex = startIndex + currentPageSize - 1;
    return [startIndex, endIndex];
  };

  const [startIndex, endIndex] = getCurrentPageResultIndices(pageSize, pageIndex, data.length);
  return (
    <>
      <table {...getTableProps()}>
        <thead>
          {headerGroups.map((headerGroup) => (
            <tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map((column) => (
                <th {...column.getHeaderProps()}>
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
              <tr {...row.getRowProps()}>
                {row.cells.map((cell) => {
                  return <td {...cell.getCellProps()}>{cell.render('Cell')}</td>;
                })}
              </tr>
            );
          })}
          <tr>
            {loading ? (
              <td colSpan="10000">Loading...</td>
            ) : (
              <td colSpan="10000">
                Showing {startIndex} - {endIndex} of ~{totalResults} total results
              </td>
            )}
          </tr>
        </tbody>
      </table>

      <div className="pagination">
        <button onClick={() => gotoPage(0)} disabled={!canPreviousPage}>
          {'<<'}
        </button>{' '}
        <button onClick={() => previousPage()} disabled={!canPreviousPage}>
          {'<'}
        </button>{' '}
        <button onClick={() => nextPage()} disabled={!canNextPage}>
          {'>'}
        </button>{' '}
        <button onClick={() => gotoPage(pageCount - 1)} disabled={!canNextPage}>
          {'>>'}
        </button>{' '}
        <span>
          Page{' '}
          <strong>
            {pageIndex + 1} of {pageOptions.length}
          </strong>{' '}
        </span>
        <span>
          | Go to page:{' '}
          <input
            type="number"
            defaultValue={pageIndex + 1}
            onChange={(e) => {
              const page = e.target.value ? Number(e.target.value) - 1 : 0;
              gotoPage(page);
            }}
            style={{ width: '100px' }}
          />
        </span>{' '}
        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
          }}
        >
          {[10, 20, 30, 40, 50].map((pageSize) => (
            <option key={pageSize} value={pageSize}>
              Show {pageSize}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}

function Donations() {
  const columns = useMemo(() => [
    {
      Header: 'Contribution ID',
      accessor: 'id'
    },
    {
      Header: 'Created',
      accessor: 'created'
    },
    {
      Header: 'Modified',
      accessor: 'modified'
    },
    {
      Header: 'Amount',
      accessor: 'amount'
    },
    {
      Header: 'Currency',
      accessor: 'currency'
    },
    {
      Header: 'Reason',
      accessor: 'reason'
    },
    {
      Header: 'Interval',
      accessor: 'interval'
    }
  ]);

  // We'll start our table without any data
  const [data, setData] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [pageCount, setPageCount] = React.useState(0);
  const [totalResults, setTotalResults] = React.useState(0);

  const fetchData = async (pageSize, pageIndex) => {
    setLoading(true);
    const {
      data: { count, results, next, previous }
    } = await axios.get(DONATIONS, { params: { page_size: pageSize, page: pageIndex } });
    // error handling
    setData(results);
    setPageCount(Math.ceil(count / pageSize));
    setTotalResults(totalResults);
    setLoading(false);
  };

  return (
    <DashboardSectionGroup data-testid="donations">
      <DashboardSection heading="Donations 1">
        <Table
          columns={columns}
          data={data}
          fetchData={fetchData}
          loading={loading}
          pageCount={pageCount}
          totalResults={totalResults}
        />
      </DashboardSection>
    </DashboardSectionGroup>
  );
}

export default Donations;
