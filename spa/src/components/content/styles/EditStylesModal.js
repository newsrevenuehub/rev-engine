import * as S from './EditStylesModal.styled';

import Modal from 'elements/modal/Modal';
import StylesEditor from 'components/stylesEditor/StylesEditor';
import CreateStyleForm from 'components/content/styles/CreateStyleForm';

function EditStylesModal({ isOpen, closeModal, styleToEdit, setStyleToEdit }) {
  const handleKeepChanges = (newStyles) => {
    // handleAddNewStyles(newStyles);
    closeModal();
  };

  const handleDiscardChanges = () => {
    closeModal();
  };

  return (
    <Modal isOpen={isOpen} closeModal={closeModal}>
      <S.EditStylesModal>
        <S.ModalTitle>{styleToEdit ? `Edit ${styleToEdit.name}` : 'Create new style'}</S.ModalTitle>
        {styleToEdit ? (
          <StylesEditor
            styles={styleToEdit}
            setStyles={setStyleToEdit}
            handleKeepChanges={handleKeepChanges}
            handleDiscardChanges={handleDiscardChanges}
          />
        ) : (
          <CreateStyleForm />
        )}
      </S.EditStylesModal>
    </Modal>
  );
}

export default EditStylesModal;
