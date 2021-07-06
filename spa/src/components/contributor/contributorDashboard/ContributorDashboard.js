import { useState, useMemo, createContext, useContext } from 'react';
import * as S from './ContributorDashboard.styled';
import { faCheck, faTimes, faQuestion, faCogs } from '@fortawesome/free-solid-svg-icons';

// Utils
import { getFrequencyAdjective } from 'utilities/parseFrequency';
import formatDatetimeForDisplay from 'utilities/formatDatetimeForDisplay';
import formatCurrencyAmount from 'utilities/formatCurrencyAmount';

// Deps
import { useAlert } from 'react-alert';

// Constants
import { GENERIC_ERROR } from 'constants/textConstants';

// AJAX
import { AuthenticationError } from 'ajax/axios';

// Children
import DashboardSectionGroup from 'components/dashboard/DashboardSectionGroup';
import DashboardSection from 'components/dashboard/DashboardSection';
import ContributorTokenExpiredModal from 'components/contributor/contributorDashboard/ContributorTokenExpiredModal';
import DonationsTable from 'components/donations/DonationsTable';

const ContributorDashboardContext = createContext();

function ContributorDashboard() {
  const alert = useAlert();
  const [tokenExpired, setTokenExpired] = useState(false);
  const [contriubtions, setContributions] = useState([]);

  const handleFetchFailure = (e) => {
    if (e instanceof AuthenticationError || e?.response?.status === 403) {
      setTokenExpired(true);
    } else {
      alert.error(GENERIC_ERROR);
    }
  };

  const columns = useMemo(
    () => [
      {
        Header: 'Amount',
        accessor: 'amount',
        Cell: (props) => (props.value ? formatCurrencyAmount(props.value) : '---')
      },
      {
        Header: 'Date',
        accessor: 'created',
        Cell: (props) => (props.value ? formatDatetimeForDisplay(props.value) : '---')
      },
      {
        Header: 'Type',
        accessor: 'interval',
        Cell: (props) => (props.value ? getFrequencyAdjective(props.value) : '---')
      },
      {
        Header: 'Receipt date',
        accessor: 'last_payment_date',
        Cell: (props) => (props.value ? formatDatetimeForDisplay(props.value) : '---')
      },
      {
        Header: 'Payment status',
        accessor: 'status',
        Cell: (props) => <StatusCellIcon status={props.value} />
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
              <DonationsTable onFetchFailure={handleFetchFailure} columns={columns} />
            </DashboardSection>
          </DashboardSectionGroup>
        </S.ContributorDashboard>
        {tokenExpired && <ContributorTokenExpiredModal isOpen={tokenExpired} />}
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
