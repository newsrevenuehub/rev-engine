import { useState } from 'react';
import * as S from './EditStylesModal.styled';

import Modal from 'elements/modal/Modal';
import StylesEditor from 'components/stylesEditor/StylesEditor';

import { donationPageBase } from 'styles/themes';
const BASE_STYLES = donationPageBase;

function EditStylesModal({ isOpen, closeModal, styleToEdit, onStylesUpdated }) {
  const [styles, setStyles] = useState(styleToEdit || BASE_STYLES);

  const handleKeepChanges = () => {
    onStylesUpdated();
    closeModal();
  };

  const handleDiscardChanges = () => {
    closeModal();
  };

  return (
    <Modal isOpen={isOpen} closeModal={closeModal}>
      <S.EditStylesModal data-testid={`edit-styles-modal-${!!styleToEdit ? 'update' : 'create'}`}>
        <S.ModalTitle>{styleToEdit ? `Edit ${styleToEdit.name}` : 'Create new style'}</S.ModalTitle>
        {styleToEdit && <S.RevenueProgramName>{styleToEdit.revenue_program?.name}</S.RevenueProgramName>}
        <StylesEditor
          isUpdate={!!styleToEdit}
          styles={styles}
          setStyles={setStyles}
          handleKeepChanges={handleKeepChanges}
          handleDiscardChanges={handleDiscardChanges}
        />
      </S.EditStylesModal>
    </Modal>
  );
}

export default EditStylesModal;
