import { useState } from 'react';

// Children
import DashboardSectionGroup from 'components/dashboard/DashboardSectionGroup';
import DashboardSection from 'components/dashboard/DashboardSection';
import Pages from 'components/content/pages/Pages';
import AddPageModal from 'components/content/pages/AddPageModal';
import PageTitle from 'elements/PageTitle';

function Content() {
  const [showAddPageModal, setShowAddPageModal] = useState(false);

  return (
    <>
      <PageTitle title="Pages" />
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
