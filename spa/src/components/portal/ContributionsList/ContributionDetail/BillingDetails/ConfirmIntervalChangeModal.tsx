import { InfoOutlined } from '@material-ui/icons';
import { Button, Modal, ModalContent, ModalFooter, ModalHeader } from 'components/base';
import PropTypes, { InferProps } from 'prop-types';

const ConfirmIntervalChangeModalPropTypes = {
  onCancel: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  open: PropTypes.bool.isRequired
};

export interface ConfirmIntervalChangeModalProps extends InferProps<typeof ConfirmIntervalChangeModalPropTypes> {
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmIntervalChangeModal({ onCancel, onConfirm, open }: ConfirmIntervalChangeModalProps) {
  return (
    <Modal onClose={onCancel} width={650} open={!!open}>
      <ModalHeader icon={<InfoOutlined />} onClose={onCancel}>
        <strong>Frequency Changes</strong>
      </ModalHeader>
      <ModalContent>
        You are changing the frequency of this contribution. Your contribution will be processed immediately.{' '}
        <strong>Please confirm these changes.</strong>
      </ModalContent>
      <ModalFooter>
        <Button color="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button color="primaryDark" onClick={onConfirm}>
          Confirm & Save
        </Button>
      </ModalFooter>
    </Modal>
  );
}

ConfirmIntervalChangeModal.propTypes = ConfirmIntervalChangeModalPropTypes;
export default ConfirmIntervalChangeModal;
