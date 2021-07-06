import * as S from './DonationsTable.styled';
import { useCallback, useState } from 'react';

import { useAlert } from 'react-alert';
import { GENERIC_ERROR } from 'constants/textConstants';

// Util
import formatDatetimeForDisplay from 'utilities/formatDatetimeForDisplay';
import formatCurrencyAmount from 'utilities/formatCurrencyAmount';

import PaginatedTable from 'elements/table/PaginatedTable';

export const DEFAULT_RESULTS_ORDERING = [
  { id: 'last_payment_date', desc: true },
  { id: 'modified', desc: true },
  { id: 'amount', desc: false },
  { id: 'contributor_email', desc: false }
];

const defaultColumns = [
  {
    Header: 'Payment date',
    accessor: 'last_payment_date',
    Cell: (props) => (props.value ? formatDatetimeForDisplay(props.value) : '---')
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
    Cell: (props) => (props.value ? formatDatetimeForDisplay(props.value) : '---')
  }
];

function DonationsTable({ columns = defaultColumns, fetchDonations, refetch, ...tableProps }) {
  const alert = useAlert();
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
      const params = { page_size: pageSize, page: pageIndex, ordering: convertOrderingToString(ordering) };
      fetchDonations(params, {
        onSuccess: ({ data }) => {
          const { results, count } = data;
          setData(results);
          setPageCount(Math.ceil(count / pageSize));
          setTotalResults(count);
          setLoading(false);
        },
        onFailure: () => {
          alert.error(GENERIC_ERROR);
          setLoading(false);
        }
      });
    },
    [alert, fetchDonations, refetch]
  );

  return (
    <S.Donations>
      <PaginatedTable
        columns={columns}
        data={data}
        fetchData={fetchData}
        loading={loading}
        pageCount={pageCount}
        totalResults={totalResults}
        {...tableProps}
      />
    </S.Donations>
  );
}

export default DonationsTable;
