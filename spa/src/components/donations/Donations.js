import * as S from './Donations.styled';

// Children
import DashboardSectionGroup from 'components/dashboard/DashboardSectionGroup';
import DashboardSection from 'components/dashboard/DashboardSection';
import DonationsTable from 'components/donations/DonationsTable';

function Donations() {
  const handleRowClick = (row) => {
    console.log('row clicked: ', row);
  };
  return (
    <S.Donations>
      <DashboardSectionGroup data-testid="donations">
        <DashboardSection heading="Donations">
          <DonationsTable onRowClick={handleRowClick} />
        </DashboardSection>
      </DashboardSectionGroup>
    </S.Donations>
  );
}

export default Donations;
