import { useCallback, useMemo, useState } from 'react';
import { Switch, useHistory, useRouteMatch } from 'react-router-dom';
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
import { pageIsPublished } from 'utilities/editPageGetSuccessMessage';
import formatCurrencyAmount from 'utilities/formatCurrencyAmount';
import formatDatetimeForDisplay from 'utilities/formatDatetimeForDisplay';

// Children
import Banner from 'components/common/Banner';
import Hero from 'components/common/Hero';
import { PaymentStatus } from 'components/common/PaymentStatus';
import DonationDetail from 'components/donations/DonationDetail';
import DonationsTable from 'components/donations/DonationsTable';
import Filters from 'components/donations/filters/Filters';
import GenericErrorBoundary from 'components/errors/GenericErrorBoundary';
import { BANNER_TYPE } from 'constants/bannerConstants';
import { PAYMENT_STATUS_EXCLUDE_IN_CONTRIBUTIONS } from 'constants/paymentStatus';
import PageTitle from 'elements/PageTitle';
import useConnectStripeAccount from 'hooks/useConnectStripeAccount';
import useContributionPageList from 'hooks/useContributionPageList';
import { SentryRoute } from 'hooks/useSentry';
import useUser from 'hooks/useUser';
import { DonationUpgradePrompts } from './DonationUpgradePrompts';
import ExportButton from 'components/common/Button/ExportButton';

const Donations = () => {
  const { path } = useRouteMatch();
  const history = useHistory();

  const { user } = useUser();
  const { requiresVerification } = useConnectStripeAccount();
  const { pages } = useContributionPageList();
  const requestDonations = useRequest();
  const [filters, setFilters] = useState({});
  const [donationsCount, setDonationsCount] = useState([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [maxData, setMaxData] = useState(0);

  const handleRowClick = (row) => history.push(`${DONATIONS_SLUG}${row.id}/`);

  const handlePageChange = (newPageIndex) => {
    setPageIndex(newPageIndex);
  };

  const bannerType = useMemo(() => {
    const hasPublished = pages && pages.some((page) => pageIsPublished(page));
    if (
      user?.role_type?.includes('hub_admin') ||
      user?.role_type?.includes('Hub Admin') ||
      (user?.revenue_programs?.length || 0) > 1 ||
      !pages?.length
    ) {
      return null;
    }
    if (requiresVerification && !hasPublished) return BANNER_TYPE.BLUE;
    if (!requiresVerification && !hasPublished) return BANNER_TYPE.YELLOW;
    return null;
  }, [pages, requiresVerification, user?.revenue_programs?.length, user?.role_type]);

  const fetchDonations = useCallback(
    (parameters, { onSuccess, onFailure }) => {
      const params = { ...parameters, ...filters, status__not: PAYMENT_STATUS_EXCLUDE_IN_CONTRIBUTIONS };
      requestDonations(
        { method: 'GET', url: CONTRIBUTIONS, params, paramsSerializer: (p) => queryString.stringify(p) },
        {
          onSuccess: (response) => {
            setDonationsCount(response.data.count);
            onSuccess(response);
            if (response.data.count > maxData) {
              setMaxData(response.data.count);
            }
          },
          onFailure
        }
      );
    },
    [filters, maxData, requestDonations]
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

  const columns = useMemo(() => {
    const defaultColumns = [
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
        Cell: (props) => <PaymentStatus status={props.value} />
      }
    ];
    return (user?.revenue_programs ?? []).length > 1
      ? [
          ...defaultColumns.slice(0, 4),
          {
            Header: 'Revenue program',
            accessor: 'revenue_program.name',
            Cell: (props) => props?.value ?? NO_VALUE
          },
          ...defaultColumns.slice(4)
        ]
      : defaultColumns;
  }, [user?.revenue_programs]);

  return (
    <>
      <PageTitle title="Contributions" />
      <div
        data-testid="donations"
        style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}
      >
        <Switch>
          <SentryRoute path={`${path}:contributionId`}>
            <DonationDetail />
          </SentryRoute>
          <SentryRoute>
            {bannerType && (
              <Banner
                type={bannerType}
                message={
                  bannerType === BANNER_TYPE.BLUE
                    ? 'Looks like you need to set up a Stripe connection in order to start receiving contributions.'
                    : 'Looks like you need to publish a contribution page in order to start receiving contributions.'
                }
              />
            )}
            <Hero
              title="Contributions"
              cornerContent={<ExportButton email={user.email} transactions={maxData} />}
              subtitle="Welcome to your contributions. Easily track and manage contributions."
            />
            <DonationUpgradePrompts />
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
          </SentryRoute>
        </Switch>
      </div>
    </>
  );
};

export default Donations;

export function DateAndTimeCell({ dateTime }) {
  return (
    <S.DateTimeCell>
      <S.DateSpan>{formatDatetimeForDisplay(dateTime, false)}</S.DateSpan>
      <S.Time>{formatDatetimeForDisplay(dateTime, true)}</S.Time>
    </S.DateTimeCell>
  );
}
