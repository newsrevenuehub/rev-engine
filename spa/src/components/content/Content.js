import { useState } from 'react';
import * as S from './Content.styled';

import { faPlus } from '@fortawesome/free-solid-svg-icons';

// Children
import CircleButton from 'elements/buttons/CircleButton';
import DashboardSectionGroup from 'components/dashboard/DashboardSectionGroup';
import DashboardSection from 'components/dashboard/DashboardSection';
import Pages from 'components/content/pages/Pages';
import AddPageModal from 'components/content/pages/AddPageModal';
import Styles from 'components/content/styles/Styles';

function Content() {
  const [showAddPageModal, setShowAddPageModal] = useState(false);

  return (
    <>
      <DashboardSectionGroup data-testid="content">
        <DashboardSection heading="Pages" collapsible>
          <Pages />
        </DashboardSection>
        <DashboardSection heading="Styles" collapsible>
          <Styles />
        </DashboardSection>
      </DashboardSectionGroup>
      {/* <S.PlusButton onClick={() => setShowAddPageModal(true)} data-testid="page-create-button">
        <CircleButton icon={faPlus} />
      </S.PlusButton> */}
      {showAddPageModal && <AddPageModal isOpen={showAddPageModal} closeModal={() => setShowAddPageModal(false)} />}
    </>
  );
}

export default Content;
