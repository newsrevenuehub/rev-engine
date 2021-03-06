import PropTypes from 'prop-types';
import * as S from './GlobalConfirmationModal.styled';
import Modal from './Modal';

import { faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
import Button from 'elements/buttons/Button';

function GlobalConfirmationModal({ message, onConfirm, onDecline, isOpen, closeModal }) {
  const handleConfirm = () => {
    onConfirm();
    closeModal();
  };

  const handleDecline = () => {
    if (onDecline) onDecline();
    closeModal();
  };

  return (
    <Modal isOpen={isOpen}>
      <S.GlobalConfirmationModal data-testid="confirmation-modal">
        <S.Warning>
          <S.Icon icon={faExclamationCircle} />
        </S.Warning>
        <S.Message>{message}</S.Message>
        <S.Buttons>
          <Button type="neutral" onClick={handleDecline} data-testid="cancel-button">
            Cancel
          </Button>
          <Button onClick={handleConfirm} data-testid="continue-button">
            Continue
          </Button>
        </S.Buttons>
      </S.GlobalConfirmationModal>
    </Modal>
  );
}

GlobalConfirmationModal.propTypes = {
  message: PropTypes.string,
  onConfirm: PropTypes.func,
  onDecline: PropTypes.func,
  isOpen: PropTypes.bool,
  closeModal: PropTypes.func
};

export default GlobalConfirmationModal;
