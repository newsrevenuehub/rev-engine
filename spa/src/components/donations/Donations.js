import { Switch, Route, useRouteMatch, useHistory } from 'react-router-dom';
import { useState, useCallback, useMemo } from 'react';
import * as S from './Donations.styled';

// AJAX
import { CONTRIBUTIONS } from 'ajax/endpoints';
import useRequest from 'hooks/useRequest';
import { getFrequencyAdjective } from 'utilities/parseFrequency';

// Deps
import queryString from 'query-string';

// Contants
import { DONATIONS_SLUG } from 'routes';
import { NO_VALUE } from 'constants/textConstants';

// Util
import formatDatetimeForDisplay from 'utilities/formatDatetimeForDisplay';
import formatCurrencyAmount from 'utilities/formatCurrencyAmount';
import { differenceInDays } from 'date-fns';

// Children
import DashboardSectionGroup from 'components/dashboard/DashboardSectionGroup';
import DashboardSection from 'components/dashboard/DashboardSection';
import DonationDetail from 'components/donations/DonationDetail';
import DonationsTable from 'components/donations/DonationsTable';
import { StatusCellIcon } from 'components/contributor/contributorDashboard/ContributorDashboard';
import Filters from 'components/donations/filters/Filters';
import GenericErrorBoundary from 'components/errors/GenericErrorBoundary';

const IS_URGENT_THRESHOLD_DAYS = 1;
const IS_SOON_THRESHOLD_DAYS = 2;

function Donations() {
  const { path } = useRouteMatch();
  const history = useHistory();

  const requestDonations = useRequest();
  const [filters, setFilters] = useState({});
  const [donationsCount, setDonationsCount] = useState([]);
  const [pageIndex, setPageIndex] = useState(0);

  const handleRowClick = (row) => history.push(`${DONATIONS_SLUG}/${row.id}/`);

  const handlePageChange = (newPageIndex) => {
    setPageIndex(newPageIndex);
  };

  const fetchDonations = useCallback(
    (parameters, { onSuccess, onFailure }) => {
      const params = { ...parameters, ...filters };
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
      },
      {
        Header: 'Date flagged',
        accessor: 'flagged_date',
        Cell: (props) => (props.value ? <DateAndTimeCell dateTime={props.value} /> : NO_VALUE)
      },
      {
        Header: 'Auto-resolution date',
        accessor: 'auto_accepted_on',
        Cell: (props) => (props.value ? <ResolutionDateCaution date={props.value} /> : NO_VALUE),
        disableSortBy: true
      }
    ],
    []
  );

  return (
    <DashboardSectionGroup data-testid="donations">
      <Switch>
        <Route path={`${path}/:contributionId`}>
          <DashboardSection heading="Contribution Info">
            <DonationDetail />
          </DashboardSection>
        </Route>
        <Route>
          <DashboardSection heading="Contributions">
            <Filters filters={filters} handleFilterChange={handleFilterChange} donationsCount={donationsCount} />
            <GenericErrorBoundary>
              <DonationsTable
                onRowClick={handleRowClick}
                columns={columns}
                fetchDonations={fetchDonations}
                pageIndex={pageIndex}
                onPageChange={handlePageChange}
              />
            </GenericErrorBoundary>
          </DashboardSection>
        </Route>
      </Switch>
    </DashboardSectionGroup>
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

function ResolutionDateCaution({ date }) {
  if (!date) return null;
  const getDateUrgency = (d) => {
    // is the date (d) within threshold and now?
    const today = new Date();
    const threshold = differenceInDays(new Date(date), today);

    if (threshold <= IS_URGENT_THRESHOLD_DAYS) return 'urgent';
    else if (threshold <= IS_SOON_THRESHOLD_DAYS) return 'soon';
  };
  return (
    <S.ResolutionDateCaution urgency={getDateUrgency(date)}>
      <DateAndTimeCell dateTime={date} />
    </S.ResolutionDateCaution>
  );
}
