import { Button, Modal, ModalFooter } from 'components/base';
import PropTypes, { InferProps } from 'prop-types';
import { ModalContent, ModalHeader, ModalHeaderIcon } from './PublishedPageLocaleChangeModal.styled';

const PublishedPageLocaleChangeModalPropTypes = {
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  open: PropTypes.bool
};

export type PublishedPageLocaleChangeModalProps = InferProps<typeof PublishedPageLocaleChangeModalPropTypes>;

export function PublishedPageLocaleChangeModal({ onClose, onConfirm, open }: PublishedPageLocaleChangeModalProps) {
  return (
    <Modal open={!!open}>
      <ModalHeader icon={<ModalHeaderIcon />} onClose={onClose}>
        Live Page Language
      </ModalHeader>
      <ModalContent>
        You're changing the language of a live contribution page. This will change all labels and helper text and could
        affect contributors' experience. Do you want to change the language?
      </ModalContent>
      <ModalFooter>
        <Button color="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button color="error" onClick={onConfirm}>
          Change
        </Button>
      </ModalFooter>
    </Modal>
  );
}

PublishedPageLocaleChangeModal.propTypes = PublishedPageLocaleChangeModalPropTypes;
export default PublishedPageLocaleChangeModal;
