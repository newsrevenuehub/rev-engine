import * as S from './DonationsTable.styled';
import { useCallback, useState } from 'react';

import { useAlert } from 'react-alert';
import { GENERIC_ERROR } from 'constants/textConstants';

// Children
import PaginatedTable from 'elements/table/PaginatedTable';
import GenericErrorBoundary from 'components/errors/GenericErrorBoundary';

export const DEFAULT_RESULTS_ORDERING = [
  { id: 'first_payment_date', desc: true },
  { id: 'contributor_email', desc: false }
];

function DonationsTable({ columns = [], fetchDonations, pageIndex, refetch, onPageChange, grow, ...tableProps }) {
  const alert = useAlert();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageCount, setPageCount] = useState(0);
  const [totalResults, setTotalResults] = useState(0);

  const convertOrderingToString = (ordering) => {
    return ordering
      .map((item) => {
        // if an ordering refers to a nested field, in SPA that will be indicated
        // by `.`. However, our ordering framework on the backend uses double underscore
        // to indicate a nested field.
        const normalizedId = item.id.replace('.', '__');
        return item.desc ? `-${normalizedId}` : normalizedId;
      })
      .toString();
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
    <S.Donations grow={grow}>
      <GenericErrorBoundary>
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
      </GenericErrorBoundary>
    </S.Donations>
  );
}

export default DonationsTable;
