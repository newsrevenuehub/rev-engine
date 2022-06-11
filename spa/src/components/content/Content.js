import { useState, useCallback } from 'react';

// AJAX
import useRequest from 'hooks/useRequest';
import { LIST_STYLES } from 'ajax/endpoints';
import { GENERIC_ERROR } from 'constants/textConstants';

// Deps
import { useAlert } from 'react-alert';

// Children
import DashboardSectionGroup from 'components/dashboard/DashboardSectionGroup';
import DashboardSection from 'components/dashboard/DashboardSection';
import Pages from 'components/content/pages/Pages';
import AddPageModal from 'components/content/pages/AddPageModal';

function Content() {
  const alert = useAlert();
  const requestGetStyles = useRequest();
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
