import { KeyboardBackspace } from '@material-ui/icons';
import PropTypes, { InferProps } from 'prop-types';
import { useEffect } from 'react';
import { Prompt, useHistory } from 'react-router-dom';
import { Tooltip } from 'components/base';
import useModal from 'hooks/useModal';
import { CONTENT_SLUG } from 'routes';
import UnsavedChangesModal from '../UnsavedChangesModal';
import { IconButton } from './BackButton.styled';

const BackButtonPropTypes = {
  confirmNavigation: PropTypes.bool
};

export type BackButtonProps = InferProps<typeof BackButtonPropTypes>;

export function BackButton({ confirmNavigation }: BackButtonProps) {
  const history = useHistory();
  const { open, handleClose, handleOpen } = useModal();

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

  return (
    <>
      <Prompt message="Are you sure you want to exit without saving your changes?" when={!!confirmNavigation} />
      <Tooltip title="Exit">
        <IconButton aria-label="Exit" onClick={handleClick}>
          <KeyboardBackspace />
        </IconButton>
      </Tooltip>
      <UnsavedChangesModal to={CONTENT_SLUG} isOpen={open} closeModal={handleClose} />
    </>
  );
}

BackButton.propTypes = BackButtonPropTypes;
export default BackButton;
