import { AxiosError } from 'axios';
import { useCallback, useState } from 'react';
import { useAlert } from 'react-alert';
import { useHistory } from 'react-router-dom';
import join from 'url-join';
import NewButton from 'components/common/Button/NewButton';
import AddPageModal from 'components/common/Modal/AddPageModal';
import MaxPagesReachedModal from 'components/common/Modal/MaxPagesReachedModal';
import useContributionPageList from 'hooks/useContributionPageList';
import useUser from 'hooks/useUser';
import useModal from 'hooks/useModal';
import { EDITOR_ROUTE } from 'routes';

function AddPage() {
  const alert = useAlert();
  const { open: addModalOpen, handleClose: handleAddModalClose, handleOpen: handleAddModalOpen } = useModal();
  const {
    open: tooManyModalOpen,
    handleClose: handleTooManyModalClose,
    handleOpen: handleTooManyModalOpen
  } = useModal();
  const history = useHistory();
  const { createPage, newPageProperties, userCanCreatePage } = useContributionPageList();
  const { user } = useUser();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string>();

  const handleImmediateCreation = useCallback(async () => {
    if (user?.revenue_programs.length !== 1) {
      // Should never happen.
      throw new Error(
        `Tried to immediately create page, but user has ${user?.revenue_programs.length} revenue programs`
      );
    }

    const revenueProgram = user.revenue_programs[0];

    try {
      const page = await createPage({ ...newPageProperties(revenueProgram.name), revenue_program: revenueProgram.id });

      history.push(join([EDITOR_ROUTE, 'pages', page.id.toString(), '/']));
    } catch (error) {
      // Log for Sentry.

      console.error(error);
      alert.error('There was an error and we could not create your new page. We have been notified.');
    }
  }, [alert, createPage, history, newPageProperties, user?.revenue_programs]);

  const handleModalCreation = useCallback(
    async (revenueProgramId: number) => {
      const revenueProgram = user?.revenue_programs.find(({ id }) => id === revenueProgramId);

      if (!revenueProgram) {
        throw new Error(`The user does not belong to the revenue program with ID ${revenueProgramId}`);
      }

      try {
        setIsCreating(true);

        const page = await createPage({
          ...newPageProperties(revenueProgram.name),
          revenue_program: revenueProgram.id
        });

        history.push(join([EDITOR_ROUTE, 'pages', page.id.toString(), '/']));
      } catch (error) {
        setIsCreating(false);

        if ((error as AxiosError).response) {
          // Use the first error in the response.

          setError(Object.values((error as AxiosError).response!.data as Record<string, string[]>)[0][0]);
        } else {
          // Log for Sentry.

          console.error(error);
          alert.error('There was an error and we could not create your new page. We have been notified.');
        }
      }
    },
    [alert, createPage, history, newPageProperties, user?.revenue_programs]
  );

  const handleClick = useCallback(() => {
    if (!user) {
      // Should never happen.
      throw new Error('User is not defined');
    }
    if (!userCanCreatePage(user)) {
      handleTooManyModalOpen();
      return;
    }

    if (user?.revenue_programs?.length === 1) {
      handleImmediateCreation();
      return;
    }

    handleAddModalOpen();
  }, [handleAddModalOpen, handleImmediateCreation, handleTooManyModalOpen, user, userCanCreatePage]);

  if (!user) {
    return null;
  }

  return (
    <>
      <NewButton buttonTestId="new-page-button" onClick={handleClick} />
      {addModalOpen && (
        <AddPageModal
          open={addModalOpen}
          onClose={handleAddModalClose}
          onAddPage={handleModalCreation}
          revenuePrograms={user?.revenue_programs ?? []}
          loading={isCreating}
          outerError={error}
        />
      )}
      {tooManyModalOpen && (
        <MaxPagesReachedModal
          currentPlan={user?.organizations[0].plan.name}
          onClose={handleTooManyModalClose}
          open={tooManyModalOpen}
          recommendedPlan={user?.organizations[0].plan.name === 'FREE' ? 'CORE' : 'PLUS'}
        />
      )}
    </>
  );
}

export default AddPage;
