import { Button, Modal, ModalContent, ModalFooter, ModalHeader } from 'components/base';
import PropTypes, { InferProps } from 'prop-types';
import ErrorIcon from '@material-design-icons/svg/outlined/error_outline.svg';

const CancelContributionModalPropTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired
};

export type CancelContributionModalProps = InferProps<typeof CancelContributionModalPropTypes>;

export function CancelContributionModal({ open, onClose, onSubmit }: CancelContributionModalProps) {
  return (
    <Modal open={open} width={660} data-testid="cancel-contribution-modal">
      <ModalHeader icon={<ErrorIcon />} onClose={onClose}>
        <strong>Cancel Payment</strong>
      </ModalHeader>
      <ModalContent>
        Your contribution has a direct impact on the work that we do. Are you sure you want to cancel your contribution?
      </ModalContent>
      <ModalFooter>
        <Button color="secondary" onClick={onClose}>
          No, continue giving
        </Button>
        <Button color="primaryDark" onClick={onSubmit}>
          Yes, cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
}

CancelContributionModal.propTypes = CancelContributionModalPropTypes;
export default CancelContributionModal;
