import * as S from './DonationsTable.styled';
import { useCallback, useState } from 'react';

import { useAlert } from 'react-alert';
import { GENERIC_ERROR } from 'constants/textConstants';

// Util
import formatDatetimeForDisplay from 'utilities/formatDatetimeForDisplay';
import formatCurrencyAmount from 'utilities/formatCurrencyAmount';

// AJAX
import { DONATIONS } from 'ajax/endpoints';
import useRequest from 'hooks/useRequest';

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

function DonationsTable({ columns = defaultColumns, handleFetchFailure }) {
  const alert = useAlert();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageCount, setPageCount] = useState(0);
  const [totalResults, setTotalResults] = useState(0);

  const requestDonations = useRequest();

  const convertOrderingToString = (ordering) => {
    return ordering.map((item) => (item.desc ? `-${item.id}` : item.id)).toString();
  };

  const fetchData = useCallback(
    async (pageSize, pageIndex, sortBy) => {
      const ordering = sortBy.length ? sortBy : DEFAULT_RESULTS_ORDERING;
      setLoading(true);
      const params = { page_size: pageSize, page: pageIndex, ordering: convertOrderingToString(ordering) };
      requestDonations(
        { method: 'GET', url: DONATIONS, params },
        {
          onSuccess: ({ data }) => {
            console.log('table response', data);
            const { results, count } = data;
            setData(results);
            setPageCount(Math.ceil(count / pageSize));
            setTotalResults(count);
            setLoading(false);
          },
          onFailure: (e) => {
            setLoading(false);
            if (handleFetchFailure) handleFetchFailure(e);
            else alert.error(GENERIC_ERROR);
          }
        }
      );
    },
    [alert, handleFetchFailure]
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
      />
    </S.Donations>
  );
}

export default DonationsTable;
