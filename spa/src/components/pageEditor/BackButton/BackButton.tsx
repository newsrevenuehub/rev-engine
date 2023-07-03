import { KeyboardBackspace } from '@material-ui/icons';
import PropTypes, { InferProps } from 'prop-types';
import { useEffect, useRef } from 'react';
import { Prompt, useHistory } from 'react-router-dom';
import { Tooltip } from 'components/base';
import useModal from 'hooks/useModal';
import { CONTENT_SLUG } from 'routes';
import { UnsavedChangesModal } from '../UnsavedChangesModal';
import { IconButton } from './BackButton.styled';

const BackButtonPropTypes = {
  confirmNavigation: PropTypes.bool
};

export type BackButtonProps = InferProps<typeof BackButtonPropTypes>;

export function BackButton({ confirmNavigation }: BackButtonProps) {
  const history = useHistory();
  const { open, handleClose, handleOpen } = useModal();

  // This is a ref so that changes to it don't require a re-render. e.g. when
  // the user confirms they want to leave via UnsavedChangesModal, we can
  // disable other prompts immediately instead of waiting for a render to occur.
  const userConfirmedNav = useRef(false);

  // Handle the user clicking reload or closing the tab. React Router navigation
  // is handled through <Prompt> below.

  useEffect(() => {
    if (confirmNavigation) {
      const prompter = (event: BeforeUnloadEvent) => {
        event.returnValue = 'Are you sure you want to exit without saving your changes?';
        event.preventDefault();
      };

      window.addEventListener('beforeunload', prompter);
      return () => window.removeEventListener('beforeunload', prompter);
    }
  }, [confirmNavigation]);

  function handleClick() {
    if (confirmNavigation) {
      handleOpen();
    } else {
      history.push(CONTENT_SLUG);
    }
  }

  function handleModalExit() {
    userConfirmedNav.current = true;
    history.push(CONTENT_SLUG);
  }

  function promptMessage() {
    if (confirmNavigation && !userConfirmedNav.current) {
      return 'Are you sure you want to exit without saving your changes?';
    }

    // Allow the transition without prompt.

    return true;
  }

  return (
    <>
      <Prompt message={promptMessage} />
      <Tooltip title="Exit">
        <IconButton aria-label="Exit" onClick={handleClick}>
          <KeyboardBackspace />
        </IconButton>
      </Tooltip>
      <UnsavedChangesModal onCancel={handleClose} onExit={handleModalExit} open={open} />
    </>
  );
}

BackButton.propTypes = BackButtonPropTypes;
export default BackButton;
