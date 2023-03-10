import CheckCircleOutlineIcon from '@material-ui/icons/CheckCircleOutline';
import PropTypes, { InferProps } from 'prop-types';
import { MouseEvent, ReactElement, useState } from 'react';
import { useAlert } from 'react-alert';
import { Tooltip } from 'components/base';
import { GENERIC_ERROR } from 'constants/textConstants';
import { ContributionPage } from 'hooks/useContributionPage';
import { useEditablePageContext } from 'hooks/useEditablePage';
import useModal from 'hooks/useModal';
import { getUpdateSuccessMessage, pageIsPublished } from 'utilities/editPageGetSuccessMessage';
import formatDatetimeForAPI from 'utilities/formatDatetimeForAPI';
import PublishModal from './PublishModal';
import PublishedPopover from './PublishedPopover';
import SuccessfulPublishModal from './SuccessfulPublishModal';
import { Root, RootButton } from './PublishButton.styled';
import { MaxPagesPublishedModal } from 'components/common/Modal/MaxPagesPublishedModal';
import useUser from 'hooks/useUser';
import useContributionPageList from 'hooks/useContributionPageList';

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
    handleClose: handlePublishModalClose,
    handleOpen: handlePublishModalOpen
  } = useModal();
  const {
    open: openSuccessfulPublishModal,
    handleClose: handleCloseSuccessfulPublishModal,
    handleOpen: handleOpenSuccessfulPublishModal
  } = useModal();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const showPopover = Boolean(anchorEl);
  const disabled = !page?.payment_provider?.stripe_verified;
  const isPublished = page && pageIsPublished(page);

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

    handlePublishModalOpen();
  };
  const handleClosePopover = () => setAnchorEl(null);
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

      handlePublishModalClose();

      // Notify the user of success.

      if (pageIsPublished(change)) {
        handleOpenSuccessfulPublishModal();
      } else {
        // This will only ever run if the page has been unpublished by the user
        // just now, which we haven't implemented yet.
        alert.success(getUpdateSuccessMessage(page, change));
      }
    } catch (error) {
      alert.error(GENERIC_ERROR);
    }
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
        open={openPublishModal}
        onClose={handlePublishModalClose}
        page={page}
        onPublish={handlePublish}
        loading={isLoading}
      />
      <SuccessfulPublishModal
        open={openSuccessfulPublishModal}
        page={page}
        onClose={handleCloseSuccessfulPublishModal}
      />
      <PublishedPopover anchorEl={anchorEl} onClose={handleClosePopover} open={showPopover} page={page} />
    </Root>
  );
}

PublishButton.propTypes = PublishButtonPropTypes;

PublishButton.defaultProps = {
  className: ''
};

export default PublishButton;
