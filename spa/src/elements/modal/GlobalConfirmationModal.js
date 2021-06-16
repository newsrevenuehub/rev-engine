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
      <S.GlobalConfirmationModal>
        <S.Warning>
          <S.Icon icon={faExclamationCircle} />
        </S.Warning>
        <S.Message>{message}</S.Message>
        <S.Buttons>
          <Button type="neutral" onClick={handleDecline}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Continue</Button>
        </S.Buttons>
      </S.GlobalConfirmationModal>
    </Modal>
  );
}

GlobalConfirmationModal.propTypes = {
  message: PropTypes.string.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onDecline: PropTypes.func,
  isOpen: PropTypes.bool.isRequired,
  closeModal: PropTypes.func.isRequired
};

export default GlobalConfirmationModal;
