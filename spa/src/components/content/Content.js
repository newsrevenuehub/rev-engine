import { useState } from 'react';
import { revEngineTheme } from 'styles/themes';

// Children
import DashboardSectionGroup from 'components/dashboard/DashboardSectionGroup';
import DashboardSection from 'components/dashboard/DashboardSection';
import Pages from 'components/content/pages/Pages';
import AddPageModal from 'components/content/pages/AddPageModal';
import Styles from 'components/content/styles/Styles';
import EditStylesModal from 'components/content/styles/EditStylesModal';

function Content() {
  const [showAddPageModal, setShowAddPageModal] = useState(false);
  const [showEditStylesModal, setShowEditStylesModal] = useState(false);
  const [styleToEdit, setStyleToEdit] = useState(revEngineTheme);

  return (
    <>
      <DashboardSectionGroup data-testid="content">
        <DashboardSection heading="Pages" collapsible>
          <Pages setShowAddPageModal={setShowAddPageModal} />
        </DashboardSection>
        <DashboardSection heading="Styles" collapsible>
          <Styles setShowEditStylesModal={setShowEditStylesModal} setStyleToEdit={setStyleToEdit} />
        </DashboardSection>
      </DashboardSectionGroup>
      {showAddPageModal && <AddPageModal isOpen={showAddPageModal} closeModal={() => setShowAddPageModal(false)} />}
      {showEditStylesModal && (
        <EditStylesModal
          styleToEdit={styleToEdit}
          isOpen={showEditStylesModal}
          closeModal={() => setShowEditStylesModal(false)}
        />
      )}
    </>
  );
}

export default Content;
