import { Modal as MuiModal, ModalProps as MuiModalProps, Paper } from '@material-ui/core';
import { forwardRef, ReactChild } from 'react';
import styled from 'styled-components';

const StyledModal = styled(MuiModal)`
  display: flex;
  align-items: center;
  justify-content: center;
`;

export interface ModalProps extends Omit<MuiModalProps, 'children'> {
  // Be more lenient with what can be used as a child. Modal expects a single
  // child, but we give it that with <Paper>.
  children: ReactChild | ReactChild[];

  /**
   * Width of the modal in pixels.
   */
  width?: number;
}

/**
 * see https://v4.mui.com/api/modal/
 */
export const Modal = forwardRef(({ children, width, ...props }: ModalProps, ref) => (
  <StyledModal {...props} ref={ref} role="dialog">
    <Paper style={{ width }}>{children}</Paper>
  </StyledModal>
));

export default Modal;
