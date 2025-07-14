import PropTypes, { InferProps } from 'prop-types';
import { Button, Modal, ModalContent, ModalFooter } from 'components/base';
import { Content, HeaderIcon, ModalHeader } from './UnsavedChangesModal.styled';

const UnsavedChangesModalPropTypes = {
  onCancel: PropTypes.func.isRequired,
  onExit: PropTypes.func.isRequired,
  open: PropTypes.bool
};

export interface UnsavedChangesModalProps extends InferProps<typeof UnsavedChangesModalPropTypes> {
  onCancel: () => void;
  onExit: () => void;
}

export function UnsavedChangesModal({ onCancel, onExit, open }: UnsavedChangesModalProps) {
  return (
    <Modal
      aria-describedby="page-editor-unsaved-changes-modal-content"
      aria-labelledby="page-editor-unsaved-changes-modal-header"
      open={!!open}
      onClose={onCancel}
    >
      <ModalHeader id="page-editor-unsaved-changes-modal-header" icon={<HeaderIcon />} onClose={onCancel}>
        Unsaved Changes
      </ModalHeader>
      <ModalContent>
        <Content id="page-editor-unsaved-changes-modal-content">
          Are you sure you want to exit without saving your changes?
        </Content>
      </ModalContent>
      <ModalFooter>
        <Button color="text" onClick={onCancel}>
          Cancel
        </Button>
        <Button color="error" onClick={onExit}>
          Yes, exit
        </Button>
      </ModalFooter>
    </Modal>
  );
}

UnsavedChangesModal.propTypes = UnsavedChangesModalPropTypes;
export default UnsavedChangesModal;
