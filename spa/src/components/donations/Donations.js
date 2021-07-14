import { Switch, Route, useRouteMatch } from 'react-router-dom';

// Children
import DashboardSectionGroup from 'components/dashboard/DashboardSectionGroup';
import DashboardSection from 'components/dashboard/DashboardSection';
import DonationsTable from 'components/donations/DonationsTable';
import DonationDetail from 'components/donations/DonationDetail';

function Donations() {
  let { path } = useRouteMatch();

  return (
    <DashboardSectionGroup data-testid="donations">
      <Switch>
        <Route path={`${path}/:contributionId`}>
          <DashboardSection heading="Donation Info">
            <DonationDetail />
          </DashboardSection>
        </Route>
        <Route>
          <DashboardSection heading="Donations">
            <DonationsTable />
          </DashboardSection>
        </Route>
      </Switch>
    </DashboardSectionGroup>
  );
}

export default Donations;
