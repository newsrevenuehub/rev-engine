import { forwardRef, useEffect, useRef } from 'react';
import { Button, ButtonProps } from 'components/base';
import useModal from 'hooks/useModal';
import UnsavedChangesModal from './UnsavedChangesModal';
import { ReactComponentLike } from 'prop-types';
import { Prompt } from 'react-router-dom';

const CONFIRM_MESSAGE = 'Are you sure you want to exit without saving your changes?';

export interface DiscardChangesButtonProps extends Omit<ButtonProps, 'onClick'> {
  /**
   * Are there changes that would be discarded?
   */
  changesPending?: boolean;
  /**
   * If set, overrides the component used for the button. It should take the
   * same props as the base Button component.
   */
  component?: ReactComponentLike;
  /**
   * Called either when the user clicks the button when changesPending is falsy,
   * or when changesPending is true and the user confirms they want to discard
   * changes.
   */
  onDiscard: () => void;
}

export const DiscardChangesButton = forwardRef<HTMLButtonElement, DiscardChangesButtonProps>(
  ({ changesPending, component, onDiscard, ...rest }, ref) => {
    // We need to be able to change this immediately, without a re-render, so
    // that the logic around allowing discards can see it when it needs to.
    const canDiscard = useRef(!changesPending);
    const { open, handleClose, handleOpen } = useModal();
    const Component = component ?? Button;

    // Handle the user clicking reload or closing the tab. React Router navigation
    // is handled through <Prompt> below.

    useEffect(() => {
      if (changesPending) {
        const prompter = (event: BeforeUnloadEvent) => {
          if (!canDiscard.current) {
            event.returnValue = CONFIRM_MESSAGE;
            event.preventDefault();
          }
        };

        window.addEventListener('beforeunload', prompter);
        return () => window.removeEventListener('beforeunload', prompter);
      }
    }, [changesPending]);

    // Handle the user navigating to another SPA route.

    function promptMessage() {
      if (!canDiscard.current) {
        return CONFIRM_MESSAGE;
      }

      // Allow the navigation.

      return true;
    }

    function handleClick() {
      if (changesPending) {
        handleOpen();
      } else {
        // We might navigate away immediately in the onDiscard handler, so we
        // need to set that it is OK to do so right now.

        canDiscard.current = true;
        onDiscard();
      }
    }

    function handleModalConfirm() {
      // See note above about setting canDiscard.

      handleClose();
      canDiscard.current = true;
      onDiscard();
    }

    return (
      <>
        <Prompt message={promptMessage} />
        <Component onClick={handleClick} ref={ref} {...rest} />
        <UnsavedChangesModal onCancel={handleClose} onExit={handleModalConfirm} open={open} />
      </>
    );
  }
);

export default DiscardChangesButton;
