import DashboardSectionGroup from 'components/dashboard/DashboardSectionGroup';
import DashboardSection from 'components/dashboard/DashboardSection';

function Organization() {
  return (
    <DashboardSectionGroup data-testid="organization">
      <DashboardSection heading="Organization 1"></DashboardSection>
    </DashboardSectionGroup>
  );
}

export default Organization;
