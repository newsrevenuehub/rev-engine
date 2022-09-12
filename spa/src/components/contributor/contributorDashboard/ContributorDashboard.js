import { useState, useMemo, createContext, useContext, useCallback } from 'react';
import CancelOutlinedIcon from '@material-ui/icons/CancelOutlined';
import CreateOutlinedIcon from '@material-ui/icons/CreateOutlined';
import * as S from './ContributorDashboard.styled';

// Assets
import visa from 'assets/icons/visa_icon.svg';
import mastercard from 'assets/icons/mastercard_icon.svg';
import amex from 'assets/icons/amex_icon.svg';
import discover from 'assets/icons/discover_icon.svg';

import { useAlert } from 'react-alert';

// Context
import { useConfirmationModalContext } from 'elements/modal/GlobalConfirmationModal';
import { NO_VALUE } from 'constants/textConstants';

// Analytics
import { useConfigureAnalytics } from 'components/analytics';

import useSubdomain from 'hooks/useSubdomain';

// Utils
import toTitleCase from 'utilities/toTitleCase';
import { getFrequencyAdjective } from 'utilities/parseFrequency';
import formatDatetimeForDisplay from 'utilities/formatDatetimeForDisplay';
import formatCurrencyAmount from 'utilities/formatCurrencyAmount';

// AJAX
import axios, { AuthenticationError } from 'ajax/axios';
import { CANCEL_RECURRING, CONTRIBUTIONS } from 'ajax/endpoints';

// Children
import ContributorTokenExpiredModal from 'components/contributor/contributorDashboard/ContributorTokenExpiredModal';
import DonationsTable from 'components/donations/DonationsTable';
import EditRecurringPaymentModal from 'components/contributor/contributorDashboard/EditRecurringPaymentModal';
import GlobalLoading from 'elements/GlobalLoading';
import { PAYMENT_STATUS } from 'constants';
import HeaderSection from 'components/common/HeaderSection';

import { CONTRIBUTION_INTERVALS } from 'constants';

const ContributorDashboardContext = createContext();

function ContributorDashboard() {
  const alert = useAlert();
  // Context
  const getUserConfirmation = useConfirmationModalContext();

  // State
  const [loading, setLoading] = useState(false);
  const [tokenExpired, setTokenExpired] = useState(false);
  const [contriubtions, setContributions] = useState([]);
  const [selectedContribution, setSelectedContribution] = useState();
  const [refetch, setRefetch] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const subdomain = useSubdomain();

  // Analytics setup
  useConfigureAnalytics();

  const handlePageChange = (newPageIndex) => {
    setPageIndex(newPageIndex);
  };

  const fetchDonations = useCallback(async (params, { onSuccess, onFailure }) => {
    try {
      const query_params = { ...params, rp: subdomain };
      const response = await axios.get(CONTRIBUTIONS, { params: { ...query_params } });
      onSuccess(response);
    } catch (e) {
      if (e instanceof AuthenticationError || e?.response?.status === 403) {
        setTokenExpired(true);
      } else {
        onFailure(e);
      }
    }
  }, []);

  const handleEditRecurringPayment = (contribution) => {
    setSelectedContribution(contribution);
  };

  const cancelContribution = useCallback(
    async (contribution) => {
      setLoading(true);
      try {
        await axios.post(`${CONTRIBUTIONS}${contribution.id}/${CANCEL_RECURRING}`);
        alert.info(
          'Recurring contribution has been canceled. No more payments will be made. Changes may not appear here immediately.',
          { timeout: 8000 }
        );
      } catch (e) {
        alert.error(
          'We were unable to cancel this recurring contribution. Please try again later. We have been notified of the problem.'
        );
      } finally {
        setLoading(false);
      }
    },
    [alert]
  );

  const handleCancelContribution = useCallback(
    (contribution) => {
      getUserConfirmation('Cancel this recurring contribution?', () => cancelContribution(contribution));
    },
    [cancelContribution, getUserConfirmation]
  );

  const getRowIsDisabled = (row) => {
    const contribution = row.original;
    const disabledStatuses = [PAYMENT_STATUS.CANCELED, PAYMENT_STATUS.PROCESSING];
    return disabledStatuses.includes(contribution.status);
  };

  const columns = useMemo(
    () => [
      {
        Header: 'Date',
        accessor: 'created',
        Cell: (props) => (props.value ? <FormatDateTime value={props.value} /> : NO_VALUE)
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
        Header: 'Receipt date',
        accessor: 'last_payment_date',
        Cell: (props) => (props.value ? <FormatDateTime value={props.value} /> : NO_VALUE)
      },
      {
        Header: 'Payment method',
        accessor: 'last4',
        Cell: (props) => (
          <PaymentMethodCell
            contribution={props.row.original}
            handlePaymentClick={getRowIsDisabled(props.row) ? undefined : handleEditRecurringPayment}
          />
        ),
        disableSortBy: true
      },
      {
        Header: 'Payment status',
        accessor: 'status',
        Cell: (props) => <StatusCellIcon status={props.value} />
      },
      {
        id: 'cancel',
        Header: 'Cancel',
        disableSortBy: true,
        Cell: (props) => (
          <CancelRecurringButton
            contribution={props.row.original}
            handleCancelContribution={handleCancelContribution}
          />
        )
      }
    ],
    [handleCancelContribution]
  );

  return (
    <ContributorDashboardContext.Provider value={{ setTokenExpired, contriubtions, setContributions }}>
      <>
        <S.ContributorDashboard>
          <HeaderSection title="Your Contributions" subtitle="Changes made may not be reflected immediately." />
          <DonationsTable
            grow
            fetchDonations={fetchDonations}
            columns={columns}
            getRowIsDisabled={getRowIsDisabled}
            refetch={refetch}
            pageIndex={pageIndex}
            onPageChange={handlePageChange}
          />
        </S.ContributorDashboard>
        {tokenExpired && <ContributorTokenExpiredModal isOpen={tokenExpired} />}
        {selectedContribution && (
          <EditRecurringPaymentModal
            isOpen={selectedContribution}
            closeModal={() => setSelectedContribution(null)}
            contribution={selectedContribution}
            onComplete={() => setRefetch(true)}
          />
        )}
        {loading && <GlobalLoading />}
      </>
    </ContributorDashboardContext.Provider>
  );
}

export const useContributorDashboardContext = () => useContext(ContributorDashboardContext);

export default ContributorDashboard;

export function StatusCellIcon({ status, showText = false, size = 'lg' }) {
  return (
    <S.StatusCellWrapper>
      <S.StatusText status={status} size={size}>
        {toTitleCase(status)}
      </S.StatusText>
    </S.StatusCellWrapper>
  );
}

export function PaymentMethodCell({ contribution, handlePaymentClick }) {
  if (!contribution.card_brand && !contribution.last4) return '?';

  const canInteract = !!handlePaymentClick && contribution.interval !== CONTRIBUTION_INTERVALS.ONE_TIME;

  return (
    <S.PaymentMethodCell
      interactive={canInteract}
      onClick={() => (canInteract ? handlePaymentClick(contribution) : {})}
      data-testid="payment-method"
    >
      <S.PaymentCardInfoWrapper>
        {contribution.card_brand && (
          <S.BrandIcon
            src={getCardBrandIcon(contribution.card_brand)}
            data-testid={`card-icon-${contribution.card_brand}`}
          />
        )}
        {contribution.last4 && <S.Last4 data-testid="card-last4">•••• {contribution.last4}</S.Last4>}
      </S.PaymentCardInfoWrapper>
      {canInteract && (
        <S.EditButton size="small" aria-label="edit payment method">
          <CreateOutlinedIcon />
        </S.EditButton>
      )}
    </S.PaymentMethodCell>
  );
}

function getCardBrandIcon(brand) {
  switch (brand) {
    case 'visa':
      return visa;
    case 'mastercard':
      return mastercard;
    case 'amex':
      return amex;
    case 'discover':
      return discover;

    default:
      return null;
  }
}

function CancelRecurringButton({ contribution, handleCancelContribution }) {
  if (contribution?.interval === CONTRIBUTION_INTERVALS.ONE_TIME || contribution?.status === 'canceled') return null;
  return (
    <S.CancelButton
      startIcon={<CancelOutlinedIcon />}
      onClick={() => handleCancelContribution(contribution)}
      data-testid="cancel-recurring-button"
    >
      Cancel
    </S.CancelButton>
  );
}

function FormatDateTime({ value }) {
  return (
    <p>
      {formatDatetimeForDisplay(value)} <S.Time>{formatDatetimeForDisplay(value, true)}</S.Time>
    </p>
  );
}
