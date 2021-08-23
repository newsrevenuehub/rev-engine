import * as S from './DonationsTable.styled';
import { useCallback, useState } from 'react';

import { useAlert } from 'react-alert';
import { GENERIC_ERROR } from 'constants/textConstants';

import PaginatedTable from 'elements/table/PaginatedTable';

export const DEFAULT_RESULTS_ORDERING = [
  { id: 'created', desc: true },
  { id: 'contributor_email', desc: false }
];

function DonationsTable({ columns = [], fetchDonations, pageIndex, refetch, onPageChange, ...tableProps }) {
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
      setLoading(true);
      const ordering = convertOrderingToString(sortBy.length ? sortBy : DEFAULT_RESULTS_ORDERING);
      const params = { page_size: pageSize, page: pageIndex, ordering };
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
    [alert, fetchDonations]
  );

  return (
    <S.Donations>
      <PaginatedTable
        onPageChange={onPageChange}
        pageIndex={pageIndex}
        columns={columns}
        data={data}
        refetch={refetch}
        fetchData={fetchData}
        loading={loading}
        pageCount={pageCount}
        totalResults={totalResults}
        defaultSortBy={DEFAULT_RESULTS_ORDERING}
        {...tableProps}
      />
    </S.Donations>
  );
}

export default DonationsTable;
