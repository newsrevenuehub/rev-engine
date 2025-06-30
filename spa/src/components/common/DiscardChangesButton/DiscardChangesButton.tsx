import { forwardRef, useEffect } from 'react';
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
    const { open, handleClose, handleOpen } = useModal();
    const Component = component ?? Button;

    // Handle the user clicking reload or closing the tab. React Router navigation
    // is handled through <Prompt> below.

    useEffect(() => {
      if (changesPending) {
        const prompter = (event: BeforeUnloadEvent) => {
          event.returnValue = CONFIRM_MESSAGE;
          event.preventDefault();
        };

        window.addEventListener('beforeunload', prompter);
        return () => window.removeEventListener('beforeunload', prompter);
      }
    }, [changesPending]);

    function handleClick() {
      if (changesPending) {
        handleOpen();
      } else {
        onDiscard();
      }
    }

    function handleModalConfirm() {
      handleClose();
      onDiscard();
    }

    return (
      <>
        <Prompt when={changesPending} message={CONFIRM_MESSAGE} />
        <Component onClick={handleClick} ref={ref} {...rest} />
        <UnsavedChangesModal onCancel={handleClose} onExit={handleModalConfirm} open={open} />
      </>
    );
  }
);

export default DiscardChangesButton;
