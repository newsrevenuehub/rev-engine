import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as S from './Modal.styled';

import { AnimatePresence } from 'framer-motion';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

function Modal({ children, isOpen, closeModal }) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => (document.body.style.overflow = '');
  }, [isOpen]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <S.Underlay isOpen={isOpen} onClick={closeModal ? closeModal : () => {}} />
          <S.Modal isOpen={isOpen} closeModal={closeModal}>
            {closeModal && (
              <S.CloseButton onClick={closeModal} data-testid="close-modal">
                <S.CloseIcon icon={faTimes} />
              </S.CloseButton>
            )}
            {children}
          </S.Modal>
        </>
      )}
    </AnimatePresence>,
    document.getElementById('modal-root')
  );
}

export default Modal;
