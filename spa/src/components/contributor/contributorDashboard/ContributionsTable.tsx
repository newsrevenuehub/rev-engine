import PropTypes, { InferProps } from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import { useAlert } from 'react-alert';
import { Pagination, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from 'components/base';
import { GlobalLoading } from 'components/common/GlobalLoading';
import useContributorContributionList from 'hooks/useContributorContributionList';
import { ContributionTableRow } from './ContributionTableRow';
import { GENERIC_ERROR } from 'constants/textConstants';

const ContributionsTablePropTypes = {
  rowsPerPage: PropTypes.number,
  rpSlug: PropTypes.string.isRequired
};

export type ContributionsTableProps = InferProps<typeof ContributionsTablePropTypes>;

export function ContributionsTable({ rowsPerPage = 10, rpSlug }: ContributionsTableProps) {
  const alert = useAlert();
  const [page, setPage] = useState(1);
  const { cancelRecurringContribution, contributions, isLoading, isError, refetch, total } =
    useContributorContributionList({
      page,
      page_size: rowsPerPage!,
      rp: rpSlug
    });
  const pageCount = useMemo(() => {
    if (!total) {
      return 0;
    }

    return Math.ceil(total / rowsPerPage!);
  }, [rowsPerPage, total]);

  useEffect(() => {
    if (isError) {
      alert.error(GENERIC_ERROR);
    }
  }, [alert, isError]);

  if (isLoading) {
    return <GlobalLoading />;
  }

  if (contributions.length === 0) {
    return <p>0 contributions to show.</p>;
  }

  // Test IDs are here for compatibility with existing Cypress tests.

  return (
    <>
      <TableContainer>
        <Table data-testid="donations-table">
          <TableHead>
            <TableRow>
              <TableCell data-testid="donation-header-0">Date</TableCell>
              <TableCell data-testid="donation-header-1">Amount</TableCell>
              <TableCell data-testid="donation-header-2">Frequency</TableCell>
              <TableCell data-testid="donation-header-3">Receipt date</TableCell>
              <TableCell data-testid="donation-header-4">Payment method</TableCell>
              <TableCell data-testid="donation-header-5">Payment status</TableCell>
              <TableCell data-testid="donation-header-6">Cancel</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {contributions.map((contribution) => (
              <ContributionTableRow
                contribution={contribution}
                key={contribution.id}
                onCancelRecurring={cancelRecurringContribution}
                onUpdateRecurringComplete={() => refetch()}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Pagination size="small" count={pageCount} onChange={(_, page) => setPage(page)} page={page} />
    </>
  );
}

ContributionsTable.propTypes = ContributionsTablePropTypes;
export default ContributionsTable;
