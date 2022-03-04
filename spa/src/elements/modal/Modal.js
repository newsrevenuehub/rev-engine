import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import * as S from './Modal.styled';

import { AnimatePresence } from 'framer-motion';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import GenericErrorBoundary from 'components/errors/GenericErrorBoundary';

function Modal({ children, isOpen, closeModal, ...props }) {
  const portalNode = useRef(document.createElement('div'));

  useEffect(() => {
    const portalDiv = portalNode.current;
    document.body.append(portalDiv);
    return () => portalDiv.parentNode.removeChild(portalDiv);
  }, []);

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
                <S.CloseIcon icon={faTimes} />
              </S.CloseButton>
            )}
            <GenericErrorBoundary>{children}</GenericErrorBoundary>
          </S.Modal>
        </>
      )}
    </AnimatePresence>,
    portalNode.current
  );
}

export default Modal;
