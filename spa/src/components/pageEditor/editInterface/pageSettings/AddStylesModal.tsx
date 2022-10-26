import PropTypes, { InferProps } from 'prop-types';
import { useState } from 'react';
import { donationPageBase } from 'styles/themes';
import StylesEditor from 'components/stylesEditor/StylesEditor';
import Modal from 'elements/modal/Modal';

const AddStylesModalPropTypes = {
  closeModal: PropTypes.func.isRequired,
  handleAddNewStyles: PropTypes.func.isRequired,
  isOpen: PropTypes.bool
};

export type AddStylesModalProps = InferProps<typeof AddStylesModalPropTypes>;

function AddStylesModal({ isOpen, closeModal, handleAddNewStyles }: AddStylesModalProps) {
  const [styles, setStyles] = useState(donationPageBase);

  const handleKeepChanges = (newStyles: unknown) => {
    handleAddNewStyles(newStyles);
    closeModal();
  };

  return (
    <Modal isOpen={isOpen} closeModal={undefined}>
      <StylesEditor
        isUpdate={false}
        styles={styles}
        setStyles={setStyles}
        handleKeepChanges={handleKeepChanges}
        handleDiscardChanges={closeModal}
      />
    </Modal>
  );
}

export default AddStylesModal;
