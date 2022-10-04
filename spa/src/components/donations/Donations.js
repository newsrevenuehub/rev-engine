import { useCallback, useMemo, useState } from 'react';
import { Route, Switch, useHistory, useRouteMatch } from 'react-router-dom';
import * as S from './Donations.styled';

// AJAX
import { CONTRIBUTIONS } from 'ajax/endpoints';
import useRequest from 'hooks/useRequest';
import { getFrequencyAdjective } from 'utilities/parseFrequency';

// Deps
import queryString from 'query-string';

// Contants
import { NO_VALUE } from 'constants/textConstants';
import { DONATIONS_SLUG } from 'routes';

// Util
import formatCurrencyAmount from 'utilities/formatCurrencyAmount';
import formatDatetimeForDisplay from 'utilities/formatDatetimeForDisplay';

// Children
import Hero from 'components/common/Hero';
import { StatusCellIcon } from 'components/contributor/contributorDashboard/ContributorDashboard';
import DashboardSection from 'components/dashboard/DashboardSection';
import DonationDetail from 'components/donations/DonationDetail';
import DonationsTable from 'components/donations/DonationsTable';
import Filters from 'components/donations/filters/Filters';
import GenericErrorBoundary from 'components/errors/GenericErrorBoundary';
import { PAYMENT_STATUS_EXCLUDE_IN_CONTRIBUTIONS } from 'constants/paymentStatus';
import PageTitle from 'elements/PageTitle';

function Donations() {
  const { path } = useRouteMatch();
  const history = useHistory();

  const requestDonations = useRequest();
  const [filters, setFilters] = useState({});
  const [donationsCount, setDonationsCount] = useState([]);
  const [pageIndex, setPageIndex] = useState(0);

  const handleRowClick = (row) => history.push(`${DONATIONS_SLUG}${row.id}/`);

  const handlePageChange = (newPageIndex) => {
    setPageIndex(newPageIndex);
  };

  const fetchDonations = useCallback(
    (parameters, { onSuccess, onFailure }) => {
      const params = { ...parameters, ...filters, status__not: PAYMENT_STATUS_EXCLUDE_IN_CONTRIBUTIONS };
      requestDonations(
        { method: 'GET', url: CONTRIBUTIONS, params, paramsSerializer: (p) => queryString.stringify(p) },
        {
          onSuccess: (response) => {
            setDonationsCount(response.data.count);
            onSuccess(response);
          },
          onFailure
        }
      );
    },
    [filters]
  );

  const handleFilterChange = (type, selectedFilter) => {
    let updatedFilter;
    if (type === 'status') updatedFilter = handleStatusChange(selectedFilter);
    if (type === 'amount') updatedFilter = selectedFilter;
    if (type === 'created') updatedFilter = selectedFilter;
    setFilters({ ...filters, ...updatedFilter });
    setPageIndex(0);
  };

  const handleStatusChange = (selectedFilter) => {
    const statuses = [...(filters.status || [])];
    const selectedIndex = statuses.indexOf(selectedFilter);
    if (selectedIndex === -1) statuses.push(selectedFilter);
    else statuses.splice(selectedIndex, 1);
    return { status: statuses };
  };

  const columns = useMemo(
    () => [
      {
        Header: 'Date',
        accessor: 'created',
        Cell: (props) => (props.value ? <DateAndTimeCell dateTime={props.value} /> : NO_VALUE)
      },
      {
        Header: 'Amount',
        accessor: 'amount',
        Cell: (props) => (props.value ? formatCurrencyAmount(props.value) : NO_VALUE)
      },
      {
        Header: 'Frequency',
        accessor: 'interval',
        Cell: (props) => (props.value ? getFrequencyAdjective(props.value) : NO_VALUE)
      },
      {
        Header: 'Payment received',
        accessor: 'last_payment_date',
        Cell: (props) => (props.value ? <DateAndTimeCell dateTime={props.value} /> : NO_VALUE)
      },
      {
        Header: 'Contributor',
        accessor: 'contributor_email',
        Cell: (props) => props.value || NO_VALUE
      },
      {
        Header: 'Payment status',
        accessor: 'status',
        Cell: (props) => <StatusCellIcon status={props.value} showText />
      }
    ],
    []
  );

  return (
    <>
      <PageTitle title="Contributions" />
      <div data-testid="donations" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Switch data-testid="donations">
          <Route path={`${path}/:contributionId`}>
            <DashboardSection heading="Contribution Info">
              <DonationDetail />
            </DashboardSection>
          </Route>
          <Route>
            <Hero
              title="Contributions"
              subtitle="Welcome to your contributions. Easily track and manage contributions."
              placeholder="Contributions"
            />
            <Filters
              filters={filters}
              handleFilterChange={handleFilterChange}
              donationsCount={donationsCount}
              excludeStatusFilters={PAYMENT_STATUS_EXCLUDE_IN_CONTRIBUTIONS}
            />
            <GenericErrorBoundary>
              <DonationsTable
                onRowClick={handleRowClick}
                columns={columns}
                fetchDonations={fetchDonations}
                pageIndex={pageIndex}
                onPageChange={handlePageChange}
                grow
              />
            </GenericErrorBoundary>
          </Route>
        </Switch>
      </div>
    </>
  );
}

export default Donations;

export function DateAndTimeCell({ dateTime }) {
  return (
    <S.DateTimeCell>
      <S.DateSpan>{formatDatetimeForDisplay(dateTime, false)}</S.DateSpan>
      <S.Time>{formatDatetimeForDisplay(dateTime, true)}</S.Time>
    </S.DateTimeCell>
  );
}
