import { useState } from 'react';
import * as S from './Pages.styled';

import { faPlus } from '@fortawesome/free-solid-svg-icons';

// Children
import DashboardSectionGroup from 'components/dashboard/DashboardSectionGroup';
import DashboardSection from 'components/dashboard/DashboardSection';
import PagesList from 'components/pages/PagesList';
import CircleButton from 'elements/buttons/CircleButton';
import AddPageModal from 'components/pages/AddPageModal';

function Pages() {
  const [showAddPageModal, setShowAddPageModal] = useState(false);

  return (
    <>
      <DashboardSectionGroup data-testid="overview">
        <DashboardSection heading="Pages 1">
          <PagesList />
        </DashboardSection>
      </DashboardSectionGroup>
      <S.PlusButton onClick={() => setShowAddPageModal(true)} data-testid="page-create-button">
        <CircleButton icon={faPlus} />
      </S.PlusButton>
      {showAddPageModal && <AddPageModal isOpen={showAddPageModal} closeModal={() => setShowAddPageModal(false)} />}
    </>
  );
}

export default Pages;
