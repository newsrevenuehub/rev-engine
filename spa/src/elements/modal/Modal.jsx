import { Close } from '@material-ui/icons';
import { AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import GenericErrorBoundary from 'components/errors/GenericErrorBoundary';
import { CloseButton, CloseIcon, Root, Underlay } from './Modal.styled';

function Modal({ children, isOpen, closeModal, ...props }) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => (document.body.style.overflow = '');
  }, [isOpen]);

  useEffect(() => {
    const closeOnEscape = (e) => {
      if (e.key === 'Escape' && closeModal) closeModal();
    };
    document.addEventListener('keyup', closeOnEscape);
    return () => document.removeEventListener('keyup', closeOnEscape);
  }, [closeModal]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <Underlay isOpen={isOpen} onClick={closeModal ? closeModal : () => {}} />
          <Root isOpen={isOpen} closeModal={closeModal} {...props}>
            {closeModal && (
              <CloseButton onClick={closeModal} data-testid="close-modal">
                <CloseIcon>
                  <Close />
                </CloseIcon>
              </CloseButton>
            )}
            <GenericErrorBoundary>{children}</GenericErrorBoundary>
          </Root>
        </>
      )}
    </AnimatePresence>,
    document.getElementById('modal-root')
  );
}

export default Modal;
