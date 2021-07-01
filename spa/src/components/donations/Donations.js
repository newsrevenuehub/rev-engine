// Children
import DashboardSectionGroup from 'components/dashboard/DashboardSectionGroup';
import DashboardSection from 'components/dashboard/DashboardSection';
import DonationsTable from 'components/donations/DonationsTable';

function Donations() {
  return (
    <DashboardSectionGroup data-testid="donations">
      <DashboardSection heading="Donations">
        <DonationsTable />
      </DashboardSection>
    </DashboardSectionGroup>
  );
}

export default Donations;
