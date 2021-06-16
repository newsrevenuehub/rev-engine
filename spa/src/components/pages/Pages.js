import DashboardSectionGroup from 'components/dashboard/DashboardSectionGroup';
import DashboardSection from 'components/dashboard/DashboardSection';

// Children
import PagesList from 'components/pages/PagesList';

function Pages() {
  return (
    <DashboardSectionGroup data-testid="overview">
      <DashboardSection heading="Pages 1">
        <PagesList />
      </DashboardSection>
    </DashboardSectionGroup>
  );
}

export default Pages;
