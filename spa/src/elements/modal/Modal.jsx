import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as S from './Modal.styled';

import { AnimatePresence } from 'framer-motion';
import GenericErrorBoundary from 'components/errors/GenericErrorBoundary';
import { Close } from '@material-ui/icons';

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
          <S.Underlay isOpen={isOpen} onClick={closeModal ? closeModal : () => {}} />
          <S.Modal isOpen={isOpen} closeModal={closeModal} {...props}>
            {closeModal && (
              <S.CloseButton onClick={closeModal} data-testid="close-modal">
                <S.CloseIcon>
                  <Close />
                </S.CloseIcon>
              </S.CloseButton>
            )}
            <GenericErrorBoundary>{children}</GenericErrorBoundary>
          </S.Modal>
        </>
      )}
    </AnimatePresence>,
    document.getElementById('modal-root')
  );
}

export default Modal;
