import { useCallback } from 'react';

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
    <DashboardSectionGroup data-testid="donations">
      <DashboardSection heading="Donations">
        <DonationsTable onRowClick={handleRowClick} fetchDonations={fetchDonations} />
      </DashboardSection>
    </DashboardSectionGroup>
  );
}

export default Donations;
