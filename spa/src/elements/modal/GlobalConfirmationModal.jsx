import { ErrorOutline } from '@material-ui/icons';
import { createContext, useCallback, useState, useContext } from 'react';
import PropTypes from 'prop-types';
import Button from 'elements/buttons/Button';
import useModal from 'hooks/useModal';
import Modal from './Modal';
import { Buttons, Icon, Message, Root, Warning } from './GlobalConfirmationModal.styled';

const ConfirmationModalContext = createContext(null);
function GlobalConfirmationModal({ children }) {
  const { open, handleOpen, handleClose } = useModal();
  const [{ onAccept, onCancel, ctaMessage }, setState] = useState({
    onAccept: undefined,
    onCancel: undefined,
    ctaMessage: ''
  });

  const handleConfirm = () => {
    onAccept();
    handleClose();
  };

  const handleDecline = () => {
    if (onCancel) onCancel();
    handleClose();
  };

  const getUserConfirmation = useCallback(
    (message, onConfirm, onDecline) => {
      handleOpen();
      setState({
        onAccept: onConfirm,
        onCancel: onDecline,
        ctaMessage: message
      });
    },
    [handleOpen, setState]
  );

  return (
    <ConfirmationModalContext.Provider value={getUserConfirmation}>
      {children}
      {open && (
        <Modal isOpen={open}>
          <Root data-testid="confirmation-modal">
            <Warning>
              <Icon>
                <ErrorOutline />
              </Icon>
            </Warning>
            <Message>{ctaMessage}</Message>
            <Buttons>
              <Button type="neutral" onClick={handleDecline} data-testid="cancel-button">
                Cancel
              </Button>
              <Button onClick={handleConfirm} data-testid="continue-button">
                Continue
              </Button>
            </Buttons>
          </Root>
        </Modal>
      )}
    </ConfirmationModalContext.Provider>
  );
}

GlobalConfirmationModal.propTypes = {
  children: PropTypes.node.isRequired
};

export const useConfirmationModalContext = () => useContext(ConfirmationModalContext);

export default GlobalConfirmationModal;
