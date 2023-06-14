import { useState } from 'react';

// Children
import Styles from 'components/content/styles/Styles';
import EditStylesModal from 'components/content/styles/EditStylesModal';
import PageTitle from 'elements/PageTitle';
import useStyleList from 'hooks/useStyleList';

function Customize() {
  const [showEditStylesModal, setShowEditStylesModal] = useState(false);
  const [styleToEdit, setStyleToEdit] = useState(null);
  const { styles, refetch } = useStyleList();

  const handleCloseEditStylesModal = () => {
    setShowEditStylesModal(false);
    setStyleToEdit(null);
  };

  return (
    <>
      <PageTitle title="Customize" />
      <Styles setShowEditStylesModal={setShowEditStylesModal} setStyleToEdit={setStyleToEdit} styles={styles} />
      {showEditStylesModal && (
        <EditStylesModal
          styleToEdit={styleToEdit}
          isOpen={showEditStylesModal}
          closeModal={handleCloseEditStylesModal}
          onStylesUpdated={refetch}
        />
      )}
    </>
  );
}

export default Customize;
