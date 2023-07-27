import { Modal as MuiModal, ModalProps as MuiModalProps, Paper, PaperProps } from '@material-ui/core';
import { forwardRef, ReactChild } from 'react';
import ReactFocusLock from 'react-focus-lock';
import styled from 'styled-components';

const StyledPaper = styled(Paper)`
  && {
    border-radius: 10px;
  }
`;

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

  PaperProps?: PaperProps;
}

// There are a number of focus-related issues with the MUI dialog that do not
// have an easy solution:
// - The paper surface itself becomes focusable
//
// - Does not focus the first input inside the modal
//
// Because of this, we disable MUI's focus handling and use react-focus-lock
// instead.
//
// To direct react-focus-lock to first focus on a particular input, put a
// `data-autofocus` attribute on it. <ModalHeader> does this to its content by
// default, so you may not need to do this.

/**
 * see https://v4.mui.com/api/modal/
 */
export const Modal = forwardRef(({ children, width, PaperProps, ...props }: ModalProps, ref) => (
  <StyledModal {...props} disableAutoFocus disableEnforceFocus disableRestoreFocus ref={ref} role="dialog">
    <ReactFocusLock returnFocus>
      <StyledPaper style={{ width }} {...PaperProps}>
        {children}
      </StyledPaper>
    </ReactFocusLock>
  </StyledModal>
));

export default Modal;
