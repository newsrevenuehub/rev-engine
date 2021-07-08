import { useCallback } from 'react';
import * as S from './Donations.styled';

// AJAX
import { DONATIONS } from 'ajax/endpoints';
import useRequest from 'hooks/useRequest';

// Children
import DashboardSectionGroup from 'components/dashboard/DashboardSectionGroup';
import DashboardSection from 'components/dashboard/DashboardSection';
import DonationsTable from 'components/donations/DonationsTable';

function Donations() {
  const requestDonations = useRequest();
  const handleRowClick = (row) => {
    console.log('row clicked: ', row);
  };

  const fetchDonations = useCallback((params, { onSuccess, onFailure }) => {
    requestDonations({ method: 'GET', url: DONATIONS, params }, { onSuccess, onFailure });
  }, []);

  return (
    <S.Donations>
      <DashboardSectionGroup data-testid="donations">
        <DashboardSection heading="Donations">
          <DonationsTable onRowClick={handleRowClick} fetchDonations={fetchDonations} />
        </DashboardSection>
      </DashboardSectionGroup>
    </S.Donations>
  );
}

export default Donations;
