import DashboardSectionGroup from 'components/dashboard/DashboardSectionGroup';
import DashboardSection from 'components/dashboard/DashboardSection';

function Pages() {
  return (
    <DashboardSectionGroup data-testid="overview">
      <DashboardSection heading="Pages 1"></DashboardSection>
      <DashboardSection heading="Pages 2"></DashboardSection>
    </DashboardSectionGroup>
  );
}

export default Pages;
