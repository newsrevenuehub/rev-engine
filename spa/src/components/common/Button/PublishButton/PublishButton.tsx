import CheckCircleOutlineIcon from '@material-ui/icons/CheckCircleOutline';
import PropTypes, { InferProps } from 'prop-types';
import { MouseEvent, ReactElement, useEffect, useState } from 'react';
import { useAlert } from 'react-alert';
import { AxiosError } from 'axios';
import { Tooltip } from 'components/base';
import { MaxPagesPublishedModal } from 'components/common/Modal/MaxPagesPublishedModal';
import { GENERIC_ERROR } from 'constants/textConstants';
import { ContributionPage } from 'hooks/useContributionPage';
import useContributionPageList from 'hooks/useContributionPageList';
import { SavePageChangesValidationErrors, useEditablePageContext } from 'hooks/useEditablePage';
import useModal from 'hooks/useModal';
import useUser from 'hooks/useUser';
import { pageIsPublished } from 'utilities/editPageGetSuccessMessage';
import formatDatetimeForAPI from 'utilities/formatDatetimeForAPI';
import PublishModal from './PublishModal';
import PublishedPopover from './PublishedPopover';
import SuccessfulPublishModal from './SuccessfulPublishModal';
import UnpublishModal from './UnpublishModal';
import { Root, RootButton } from './PublishButton.styled';
import { getUserRole } from 'utilities/getUserRole';

const PublishButtonPropTypes = {
  className: PropTypes.string
};

export type PublishButtonProps = InferProps<typeof PublishButtonPropTypes>;

function DisabledTooltip({ children, disabled }: { children: ReactElement; disabled?: boolean }) {
  return disabled ? (
    <Tooltip
      placement="bottom-end"
      title={
        <div>
          Connect to Stripe to publish page.
          <br />
          Return to dashboard to connect.
        </div>
      }
    >
      {children}
    </Tooltip>
  ) : (
    <>{children}</>
  );
}

function PublishButton({ className }: PublishButtonProps) {
  const alert = useAlert();
  const { isLoading, page, savePageChanges } = useEditablePageContext();
  const { userCanPublishPage } = useContributionPageList();
  const { user } = useUser();
  const {
    open: openMaxPagesPublishedModal,
    handleClose: handleCloseMaxPagesPublishedModal,
    handleOpen: handleOpenMaxPagesPublishedModal
  } = useModal();
  const {
    open: openPublishModal,
    handleClose: handleClosePublishModal,
    handleOpen: handleOpenPublishModal
  } = useModal();
  const {
    open: openSuccessfulPublishModal,
    handleClose: handleCloseSuccessfulPublishModal,
    handleOpen: handleOpenSuccessfulPublishModal
  } = useModal();
  const {
    open: openUnpublishModal,
    handleClose: handleCloseUnpublishModal,
    handleOpen: handleOpenUnpublishModal
  } = useModal();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [slugError, setSlugError] = useState<string[]>();
  const showPopover = Boolean(anchorEl);
  const disabled = !page?.payment_provider?.stripe_verified;
  const isPublished = page && pageIsPublished(page);

  const handleClosePopover = () => {
    setAnchorEl(null);
  };

  useEffect(() => {
    // If the page became unpublished, hide the published popover.

    if (page && !pageIsPublished(page) && showPopover) {
      handleClosePopover();
    }
  }, [page, showPopover]);

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    // These should never happen, but TypeScript doesn't know that.

    if (!page) {
      throw new Error('page is not defined');
    }

    if (!user) {
      throw new Error('user is not defined');
    }

    // If the page has been published, show the popover.

    if (pageIsPublished(page)) {
      setAnchorEl(event.currentTarget);
      return;
    }

    // If the user's hit their plan limit, stop them here.

    if (!userCanPublishPage(user)) {
      handleOpenMaxPagesPublishedModal();
      return;
    }

    // Show them the publish modal.

    handleOpenPublishModal();
  };

  // Opening the unpublish modal should hide the popover it was created from.

  const handleUnpublishOpen = () => {
    handleClosePopover();
    handleOpenUnpublishModal();
  };

  const handlePublish = async (changes: Pick<ContributionPage, 'slug'>) => {
    // These should never happen, but TypeScript doesn't know that.

    if (!page) {
      throw new Error('page is not defined');
    }

    if (!savePageChanges) {
      throw new Error('savePageChanges is not defined');
    }

    const change = { ...changes, published_date: formatDatetimeForAPI(new Date()) };

    try {
      // Data layer changes.

      await savePageChanges(change);

      // Close the previous modal.

      handleClosePublishModal();

      // Notify the user of success.

      handleOpenSuccessfulPublishModal();

      // Track an event in Pendo if available. It will only be available when
      // the user is an org admin. If it fails, log the problem but don't show
      // an error to the user.

      if ((window as any).pendo) {
        try {
          (window as any).pendo.track('contribution-page-publish', {
            id: page.id,
            name: page.name
          });
        } catch (error) {
          console.error(`Couldn't track a page publish event in Pendo: ${(error as Error).message}`);
        }
      }
    } catch (err) {
      const error = err as AxiosError<SavePageChangesValidationErrors>;
      const { isHubAdmin, isSuperUser } = getUserRole(user);

      if (error.response?.data?.slug) {
        // If there is a slug error, we pass it to the modal.

        setSlugError(error.response.data.slug);
      } else if ((isHubAdmin || isSuperUser) && error.response?.data?.non_field_errors?.[0]) {
        // Hub admins can see errors directly.

        alert.error(error.response.data.non_field_errors[0]);
      } else {
        alert.error(GENERIC_ERROR);
      }
    }
  };

  const handleUnpublish = async () => {
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

    handleCloseUnpublishModal();
  };

  if (!page || !user) {
    return null;
  }

  return (
    <Root className={className!}>
      <DisabledTooltip disabled={disabled}>
        {/* Disabled elements do not fire events. Need the DIV over button for tooltip to listen to events. */}
        <div data-testid="publish-button-wrapper">
          <RootButton
            variant="contained"
            onClick={handleClick}
            $active={showPopover}
            aria-label={`${isPublished ? 'Published' : 'Publish'} page ${page?.name}`}
            data-testid="publish-button"
            disabled={disabled}
            {...(isPublished && {
              startIcon: <CheckCircleOutlineIcon />,
              $published: true,
              variant: 'outlined'
            })}
          >
            {isPublished ? 'Published' : 'Publish'}
          </RootButton>
        </div>
      </DisabledTooltip>
      <MaxPagesPublishedModal
        onClose={handleCloseMaxPagesPublishedModal}
        open={openMaxPagesPublishedModal}
        currentPlan={user.organizations[0].plan.name}
      />
      <PublishModal
        slugError={slugError}
        open={openPublishModal}
        onClose={handleClosePublishModal}
        page={page}
        onPublish={handlePublish}
        loading={isLoading}
      />
      <SuccessfulPublishModal
        open={openSuccessfulPublishModal}
        page={page}
        onClose={handleCloseSuccessfulPublishModal}
      />
      <PublishedPopover
        anchorEl={anchorEl}
        onClose={handleClosePopover}
        onUnpublish={handleUnpublishOpen}
        open={showPopover}
        page={page}
      />
      <UnpublishModal
        onClose={handleCloseUnpublishModal}
        onUnpublish={handleUnpublish}
        open={openUnpublishModal}
        page={page}
      />
    </Root>
  );
}

PublishButton.propTypes = PublishButtonPropTypes;

PublishButton.defaultProps = {
  className: ''
};

export default PublishButton;
