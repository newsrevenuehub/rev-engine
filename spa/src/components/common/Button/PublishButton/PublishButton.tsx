import React, { useState } from 'react';
import PropTypes, { InferProps } from 'prop-types';
// import { CircularProgress, Divider } from '@material-ui/core';
import LaunchIcon from '@material-ui/icons/Launch';
import CheckCircleOutlineIcon from '@material-ui/icons/CheckCircleOutline';
import FiberManualRecordIcon from '@material-ui/icons/FiberManualRecord';

import useModal from 'hooks/useModal';
import formatDatetimeForDisplay from 'utilities/formatDatetimeForDisplay';
import { getUpdateSuccessMessage, pageIsPublished } from 'utilities/editPageGetSuccessMessage';
import { PagePropTypes } from 'constants/propTypes';
import { pageLink } from 'utilities/getPageLinks';

import { Flex, Button, Popover, LiveText, /*UnpublishButton, */ Text, IconButton } from './PublishButton.styled';
import PublishModal from './PublishModal';
import SuccessfulPublishModal from './SuccessfulPublishModal';
import { ContributionPage, useContributionPage } from 'hooks/useContributionPage';
import formatDatetimeForAPI from 'utilities/formatDatetimeForAPI';
import { Tooltip } from 'components/base';
import { GENERIC_ERROR } from 'constants/textConstants';
import { useAlert } from 'react-alert';
import urlJoin from 'url-join';

const PublishButtonPropTypes = {
  className: PropTypes.string,
  page: PropTypes.shape(PagePropTypes),
  setPage: PropTypes.func
};

export interface PublishButtonProps extends InferProps<typeof PublishButtonPropTypes> {
  page: ContributionPage | null;
}

function PublishButton({ className, page, setPage }: PublishButtonProps) {
  const alert = useAlert();
  // This call needs to use the page ID because its slug may change during the publish process.
  const { isLoading, updatePage } = useContributionPage(page?.id);
  const { open, handleClose, handleOpen } = useModal();
  const {
    open: openSuccessfulPublishModal,
    handleClose: handleCloseSuccessfulPublishModal,
    handleOpen: handleOpenSuccessfulPublishModal
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

  // TODO: update handleUnpublish when implementation of "Unpublish" functionality is decided
  // const handleUnpublish = () => {
  //   patchPage({ published_date: 'TBD' });
  // };

  const handlePublish = async (changes: Pick<ContributionPage, 'slug'>) => {
    // These should never happen, but TypeScript doesn't know that.

    if (!page) {
      throw new Error('page is not defined');
    }

    if (!setPage) {
      throw new Error('setPage is not defined');
    }

    if (!updatePage) {
      throw new Error('updatePage is not defined');
    }

    // Update the page in the API and context.

    const change = { ...changes, published_date: formatDatetimeForAPI(new Date()) };

    try {
      // Data layer changes.

      await updatePage(change);
      setPage({ ...page, ...change });

      // Change the path in the browser *without* causing a re-render. We need
      // the URL to change to the correct slug so that if the user reloads the
      // page, they use the correct slug (otherwise they'd get a 'no page at
      // this address' error). However, we don't want to trigger a re-render
      // because that would prevent the user from seeing the success alert, and
      // generally would change the UI on them.

      window.history.replaceState(null, window.name, urlJoin(`/edit/${page.revenue_program.slug}/${change.slug}/`));

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
          <Button
            variant="contained"
            onClick={isPublished ? handleOpenPopover : handleOpen}
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
          </Button>
        </div>
      </Tooltip>
      {open && (
        <PublishModal open={open} onClose={handleClose} page={page} onPublish={handlePublish} loading={isLoading} />
      )}
      {showPopover && (
        <Popover
          open={showPopover}
          anchorEl={anchorEl}
          onClose={handleClosePopover}
          anchorOrigin={{
            vertical: 'bottom',
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
          <Text>
            {/* TODO: add author of change */}
            {formatDatetimeForDisplay(page?.published_date)} at {formatDatetimeForDisplay(page?.published_date, true)}
          </Text>
          {/* TODO: update UnpublishButton when implementation of "Unpublish" functionality is decided */}
          {/* <Divider />
          <UnpublishButton onClick={handleUnpublish} disabled={loading} aria-label={`Unpublish page ${page?.name}`}>
            {loading ? <CircularProgress size={16} style={{ color: 'white' }} /> : 'Unpublish'}
          </UnpublishButton> */}
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
  className: '',
  page: null
};

export default PublishButton;
