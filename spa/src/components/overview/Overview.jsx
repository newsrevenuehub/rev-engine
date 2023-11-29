import DashboardSectionGroup from 'components/dashboard/DashboardSectionGroup';
import DashboardSection from 'components/dashboard/DashboardSection';

function Overview() {
  return (
    <DashboardSectionGroup data-testid="overview">
      <DashboardSection heading="Overview 1"></DashboardSection>
    </DashboardSectionGroup>
  );
}

export default Overview;
