import DashboardSectionGroup from 'components/dashboard/DashboardSectionGroup';
import DashboardSection from 'components/dashboard/DashboardSection';

function Donations() {
  return (
    <DashboardSectionGroup data-testid="donations">
      <DashboardSection heading="Donations 1"></DashboardSection>
    </DashboardSectionGroup>
  );
}

export default Donations;
