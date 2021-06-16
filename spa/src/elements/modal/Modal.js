import { createPortal } from 'react-dom';
import * as S from './Modal.styled';

import { AnimatePresence } from 'framer-motion';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

function Modal({ children, isOpen, closeModal }) {
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <S.Underlay isOpen={isOpen} onClick={closeModal ? closeModal : () => {}} />
          <S.Modal isOpen={isOpen} closeModal={closeModal}>
            {closeModal && (
              <S.CloseButton onClick={closeModal}>
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
