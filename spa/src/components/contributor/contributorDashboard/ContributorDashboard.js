import { useState, useMemo, createContext, useContext, useCallback } from 'react';
import * as S from './ContributorDashboard.styled';
import { faCheck, faTimes, faQuestion, faCogs } from '@fortawesome/free-solid-svg-icons';

// Assets
import visa from 'assets/images/visa-logo.png';
import mastercard from 'assets/images/mastercard-logo.png';
import amex from 'assets/images/amex-logo.png';
import discover from 'assets/images/discover-logo.png';

// Utils
import { getFrequencyAdjective } from 'utilities/parseFrequency';
import formatDatetimeForDisplay from 'utilities/formatDatetimeForDisplay';
import formatCurrencyAmount from 'utilities/formatCurrencyAmount';

// AJAX
import axios, { AuthenticationError } from 'ajax/axios';
import { CONTRIBUTIONS } from 'ajax/endpoints';

// Children
import DashboardSectionGroup from 'components/dashboard/DashboardSectionGroup';
import DashboardSection from 'components/dashboard/DashboardSection';
import ContributorTokenExpiredModal from 'components/contributor/contributorDashboard/ContributorTokenExpiredModal';
import DonationsTable from 'components/donations/DonationsTable';
import EditRecurringPaymentModal from 'components/contributor/contributorDashboard/EditRecurringPaymentModal';

const NO_CONTENT = '---';

const ContributorDashboardContext = createContext();

function ContributorDashboard() {
  const [tokenExpired, setTokenExpired] = useState(false);
  const [contriubtions, setContributions] = useState([]);
  const [selectedContribution, setSelectedContribution] = useState();
  const [refetch, setRefetch] = useState(false);

  const fetchDonations = useCallback(async (params, { onSuccess, onFailure }) => {
    try {
      const response = await axios.get(CONTRIBUTIONS, { params });
      console.log('response: ', response);
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

  const columns = useMemo(
    () => [
      {
        Header: 'Amount',
        accessor: 'amount',
        Cell: (props) => (props.value ? formatCurrencyAmount(props.value) : NO_CONTENT)
      },
      {
        Header: 'Date',
        accessor: 'created',
        Cell: (props) => (props.value ? formatDatetimeForDisplay(props.value) : NO_CONTENT)
      },
      {
        Header: 'Type',
        accessor: 'interval',
        Cell: (props) => (props.value ? getFrequencyAdjective(props.value) : NO_CONTENT)
      },
      {
        Header: 'Receipt date',
        accessor: 'last_payment_date',
        Cell: (props) => (props.value ? formatDatetimeForDisplay(props.value) : NO_CONTENT)
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
          <PaymentMethodCell contribution={props.row.original} handlePaymentClick={handleEditRecurringPayment} />
        ),
        disableSortBy: true
      }
    ],
    []
  );

  return (
    <ContributorDashboardContext.Provider value={{ setTokenExpired, contriubtions, setContributions }}>
      <>
        <S.ContributorDashboard>
          <DashboardSectionGroup>
            <DashboardSection heading="Your contributions">
              <DonationsTable fetchDonations={fetchDonations} columns={columns} refetch={refetch} />
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
      </>
    </ContributorDashboardContext.Provider>
  );
}

export const useContributorDashboardContext = () => useContext(ContributorDashboardContext);

export default ContributorDashboard;

function StatusCellIcon({ status }) {
  return (
    <S.StatusCellWrapper>
      <S.StatusCellIcon icon={getStatusCellIcon(status)} status={status} />
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
    default:
      return faQuestion;
  }
}

export function PaymentMethodCell({ contribution, handlePaymentClick }) {
  if (!contribution.card_brand && !contribution.last4) return '?';
  return (
    <S.PaymentMethodCell
      interactive={!!handlePaymentClick}
      onClick={() => (handlePaymentClick ? handlePaymentClick(contribution) : {})}
    >
      {contribution.card_brand && <S.BrandIcon src={getCardBrandIcon(contribution.card_brand)} />}
      {contribution.last4 && <S.Last4>•••• {contribution.last4}</S.Last4>}
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
