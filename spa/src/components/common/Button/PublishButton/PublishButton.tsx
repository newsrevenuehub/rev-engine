import React, { useEffect, useState } from 'react';
import PropTypes, { InferProps } from 'prop-types';
import { Divider } from '@material-ui/core';
import LaunchIcon from '@material-ui/icons/Launch';
import CheckCircleOutlineIcon from '@material-ui/icons/CheckCircleOutline';
import FiberManualRecordIcon from '@material-ui/icons/FiberManualRecord';

import useModal from 'hooks/useModal';
import formatDatetimeForDisplay from 'utilities/formatDatetimeForDisplay';
import { pageIsPublished } from 'utilities/editPageGetSuccessMessage';
import { pageLink } from 'utilities/getPageLinks';

import {
  Flex,
  Popover,
  LiveText,
  Text,
  IconButton,
  UnpublishButtonContainer,
  RootButton
} from './PublishButton.styled';
import PublishModal from './PublishModal';
import SuccessfulPublishModal from './SuccessfulPublishModal';
import { ContributionPage } from 'hooks/useContributionPage';
import formatDatetimeForAPI from 'utilities/formatDatetimeForAPI';
import { Button, Tooltip } from 'components/base';
import { GENERIC_ERROR } from 'constants/textConstants';
import { useAlert } from 'react-alert';
import { useEditablePageContext } from 'hooks/useEditablePage';
import UnpublishModal from './UnpublishModal';

const PublishButtonPropTypes = {
  className: PropTypes.string
};

export type PublishButtonProps = InferProps<typeof PublishButtonPropTypes>;

function PublishButton({ className }: PublishButtonProps) {
  const alert = useAlert();
  const { isLoading, page, savePageChanges } = useEditablePageContext();
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
  const showPopover = Boolean(anchorEl);
  const disabled = !page?.payment_provider?.stripe_verified;
  const isPublished = page && pageIsPublished(page);

  const handleOpenPopover: React.MouseEventHandler<HTMLButtonElement> = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClosePopover = () => {
    setAnchorEl(null);
  };

  useEffect(() => {
    // If the page became unpublished, hide the published popover.

    if (page && !pageIsPublished(page) && showPopover) {
      handleClosePopover();
    }
  }, [page, showPopover]);

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

      // Notify the user of success.

      if (pageIsPublished(change)) {
        handleOpenSuccessfulPublishModal();
      }
    } catch (error) {
      alert.error(GENERIC_ERROR);
    }
  };

  // Opening the unpublish modal should hide the popover it was created from.

  const handleUnpublishOpen = () => {
    handleClosePopover();
    handleOpenUnpublishModal();
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

  if (!page) {
    return null;
  }

  return (
    <Flex className={className!}>
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
        {/* Disabled elements do not fire events. Need the DIV over button for tooltip to listen to events. */}
        <div data-testid="publish-button-wrapper">
          <RootButton
            variant="contained"
            onClick={isPublished ? handleOpenPopover : handleOpenPublishModal}
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
      </Tooltip>
      {openPublishModal && (
        <PublishModal
          open={openPublishModal}
          onClose={handleClosePublishModal}
          page={page}
          onPublish={handlePublish}
          loading={isLoading}
        />
      )}
      {openUnpublishModal && (
        <UnpublishModal
          onClose={handleCloseUnpublishModal}
          onUnpublish={handleUnpublish}
          open={openUnpublishModal}
          page={page}
        />
      )}
      {showPopover && (
        <Popover
          open={showPopover}
          anchorEl={anchorEl}
          onClose={handleClosePopover}
          anchorOrigin={{
            vertical: 41,
            horizontal: 'right'
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right'
          }}
        >
          <LiveText>
            <FiberManualRecordIcon />
            Live
          </LiveText>
          <Tooltip title="Go to Page" placement="bottom-end">
            <IconButton
              component="a"
              href={`//${pageLink(page)}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Page link"
            >
              <LaunchIcon />
            </IconButton>
          </Tooltip>
          <Text data-testid="publish-date">
            {formatDatetimeForDisplay(page?.published_date)} at {formatDatetimeForDisplay(page?.published_date, true)}
          </Text>
          <Divider />
          <UnpublishButtonContainer>
            <Button color="error" onClick={handleUnpublishOpen}>
              Unpublish
            </Button>
          </UnpublishButtonContainer>
        </Popover>
      )}
      {openSuccessfulPublishModal && (
        <SuccessfulPublishModal
          open={openSuccessfulPublishModal}
          page={page}
          onClose={handleCloseSuccessfulPublishModal}
        />
      )}
    </Flex>
  );
}

PublishButton.propTypes = PublishButtonPropTypes;

PublishButton.defaultProps = {
  className: ''
};

export default PublishButton;
