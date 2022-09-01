import { useState } from 'react';

// Children
import Pages from 'components/content/pages/Pages';
import AddPageModal from 'components/content/pages/AddPageModal';
import PageTitle from 'elements/PageTitle';

function Content() {
  const [showAddPageModal, setShowAddPageModal] = useState(false);

  return (
    <>
      <PageTitle title="Pages" />
      <Pages setShowAddPageModal={setShowAddPageModal} />
      {showAddPageModal && <AddPageModal isOpen={showAddPageModal} closeModal={() => setShowAddPageModal(false)} />}
    </>
  );
}

export default Content;
