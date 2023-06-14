import { useState } from 'react';
import * as S from './AddStylesModal.styled';
import { donationPageBase } from 'styles/themes';

// Children
import StylesEditor from 'components/stylesEditor/StylesEditor';
import Modal from 'elements/modal/Modal';

function AddStylesModal({ isOpen, closeModal, handleAddNewStyles }) {
  const [styles, setStyles] = useState(donationPageBase);

  const handleKeepChanges = (newStyles) => {
    handleAddNewStyles(newStyles);
    closeModal();
  };

  const handleDiscardChanges = () => {
    closeModal();
  };

  return (
    <Modal isOpen={isOpen}>
      <S.AddStylesModal>
        <StylesEditor
          styles={styles}
          setStyles={setStyles}
          handleKeepChanges={handleKeepChanges}
          handleDiscardChanges={handleDiscardChanges}
        />
      </S.AddStylesModal>
    </Modal>
  );
}

export default AddStylesModal;
