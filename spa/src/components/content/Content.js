import { useState } from 'react';

// Children
import DashboardSectionGroup from 'components/dashboard/DashboardSectionGroup';
import DashboardSection from 'components/dashboard/DashboardSection';
import Pages from 'components/content/pages/Pages';
import AddPageModal from 'components/content/pages/AddPageModal';

function Content() {
  const [showAddPageModal, setShowAddPageModal] = useState(false);

  return (
    <>
      <DashboardSectionGroup data-testid="content">
        <DashboardSection heading="Pages" collapsible data-testid="pages-section">
          <Pages setShowAddPageModal={setShowAddPageModal} />
        </DashboardSection>
      </DashboardSectionGroup>
      {showAddPageModal && <AddPageModal isOpen={showAddPageModal} closeModal={() => setShowAddPageModal(false)} />}
    </>
  );
}

export default Content;
