import { useState, useMemo, createContext, useContext, useCallback } from 'react';
import * as S from './ContributorDashboard.styled';
import { faCheck, faTimes, faFlag, faSlash, faQuestion, faCogs, faBan } from '@fortawesome/free-solid-svg-icons';

// Assets
import visa from 'assets/images/visa-logo.png';
import mastercard from 'assets/images/mastercard-logo.png';
import amex from 'assets/images/amex-logo.png';
import discover from 'assets/images/discover-logo.png';

import { useAlert } from 'react-alert';

// Context
import { useGlobalContext } from 'components/MainLayout';
import { NO_VALUE } from 'constants/textConstants';

// Utils
import toTitleCase from 'utilities/toTitleCase';
import { getFrequencyAdjective } from 'utilities/parseFrequency';
import formatDatetimeForDisplay from 'utilities/formatDatetimeForDisplay';
import formatCurrencyAmount from 'utilities/formatCurrencyAmount';

// AJAX
import axios, { AuthenticationError } from 'ajax/axios';
import { CANCEL_RECURRING, CONTRIBUTIONS } from 'ajax/endpoints';

// Children
import DashboardSectionGroup from 'components/dashboard/DashboardSectionGroup';
import DashboardSection from 'components/dashboard/DashboardSection';
import ContributorTokenExpiredModal from 'components/contributor/contributorDashboard/ContributorTokenExpiredModal';
import DonationsTable from 'components/donations/DonationsTable';
import EditRecurringPaymentModal from 'components/contributor/contributorDashboard/EditRecurringPaymentModal';
import GlobalLoading from 'elements/GlobalLoading';

const ContributorDashboardContext = createContext();

function ContributorDashboard() {
  const alert = useAlert();
  // Context
  const { getUserConfirmation } = useGlobalContext();

  // State
  const [loading, setLoading] = useState(false);
  const [tokenExpired, setTokenExpired] = useState(false);
  const [contriubtions, setContributions] = useState([]);
  const [selectedContribution, setSelectedContribution] = useState();
  const [refetch, setRefetch] = useState(false);

  const fetchDonations = useCallback(async (params, { onSuccess, onFailure }) => {
    try {
      const response = await axios.get(CONTRIBUTIONS, { params });
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
    const disabledStatuses = ['canceled', 'processing'];
    return disabledStatuses.includes(contribution.status);
  };

  const columns = useMemo(
    () => [
      {
        Header: 'Amount',
        accessor: 'amount',
        Cell: (props) => (props.value ? formatCurrencyAmount(props.value) : NO_VALUE)
      },
      {
        Header: 'Date',
        accessor: 'created',
        Cell: (props) => (props.value ? formatDatetimeForDisplay(props.value) : NO_VALUE)
      },
      {
        Header: 'Type',
        accessor: 'interval',
        Cell: (props) => (props.value ? getFrequencyAdjective(props.value) : NO_VALUE)
      },
      {
        Header: 'Receipt date',
        accessor: 'last_payment_date',
        Cell: (props) => (props.value ? formatDatetimeForDisplay(props.value) : NO_VALUE)
      },
      {
        Header: 'Payment status',
        accessor: 'status',
        Cell: (props) => <StatusCellIcon status={props.value} />
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
          <DashboardSectionGroup>
            <DashboardSection heading="Your contributions">
              <S.Disclaimer>Changes made may not be reflected immediately.</S.Disclaimer>
              <DonationsTable
                fetchDonations={fetchDonations}
                columns={columns}
                getRowIsDisabled={getRowIsDisabled}
                refetch={refetch}
              />
            </DashboardSection>
          </DashboardSectionGroup>
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
      <S.StatusCellIcon icon={getStatusCellIcon(status)} status={status} size={size} />
      {showText && <S.StatusText size={size}>{toTitleCase(status)}</S.StatusText>}
    </S.StatusCellWrapper>
  );
}

function getStatusCellIcon(status) {
  switch (status) {
    case 'processing':
      return faCogs;
    case 'failed':
      return faTimes;
    case 'paid':
      return faCheck;
    case 'canceled':
      return faBan;
    case 'flagged':
      return faFlag;
    case 'rejected':
      return faSlash;
    default:
      return faQuestion;
  }
}

export function PaymentMethodCell({ contribution, handlePaymentClick }) {
  if (!contribution.card_brand && !contribution.last4) return '?';

  const getCanInteract = () => {
    return !!handlePaymentClick && contribution.interval !== 'one_time';
  };

  return (
    <S.PaymentMethodCell
      interactive={getCanInteract()}
      onClick={() => (getCanInteract() ? handlePaymentClick(contribution) : {})}
      data-testid="payment-method"
    >
      {contribution.card_brand && (
        <S.BrandIcon
          src={getCardBrandIcon(contribution.card_brand)}
          data-testid={`card-icon-${contribution.card_brand}`}
        />
      )}
      {contribution.last4 && <S.Last4 data-testid="card-last4">•••• {contribution.last4}</S.Last4>}
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
  if (contribution?.interval === 'one_time' || contribution?.status === 'canceled') return null;
  return (
    <S.CancelButton onClick={() => handleCancelContribution(contribution)} data-testid="cancel-recurring-button">
      <S.CancelIcon icon={faBan} />
    </S.CancelButton>
  );
}
