import { useAlert } from 'react-alert';
import { useEditablePageContext } from 'hooks/useEditablePage';
import { Button } from 'components/base';
import { GENERIC_ERROR } from 'constants/textConstants';
import useModal from 'hooks/useModal';
import UnpublishModal from './UnpublishModal/UnpublishModal';

export function UnpublishButton() {
  const alert = useAlert();
  const { page, savePageChanges } = useEditablePageContext();
  const { handleClose, handleOpen, open } = useModal();

  async function handleUnpublish() {
    if (!savePageChanges) {
      // Should never happen.

      throw new Error('savePageChanges is not defined');
    }

    try {
      await savePageChanges({ published_date: undefined });
    } catch (error) {
      // Log for Sentry and show an alert.

      console.error(error);
      alert.error(GENERIC_ERROR);
    }

    handleClose();
  }

  if (!page || !savePageChanges) {
    return null;
  }

  return (
    <>
      <Button color="error" onClick={handleOpen}>
        Unpublish
      </Button>
      <UnpublishModal onClose={handleClose} onUnpublish={handleUnpublish} open={open} page={page} />
    </>
  );
}

export default UnpublishButton;
