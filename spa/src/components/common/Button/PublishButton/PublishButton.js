import { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
// import { CircularProgress, Divider } from '@material-ui/core';
import LaunchIcon from '@material-ui/icons/Launch';
import CheckCircleOutlineIcon from '@material-ui/icons/CheckCircleOutline';
import FiberManualRecordIcon from '@material-ui/icons/FiberManualRecord';

import useModal from 'hooks/useModal';
import formatDatetimeForDisplay from 'utilities/formatDatetimeForDisplay';
import getSuccessMessage, { pageHasBeenPublished } from 'utilities/editPageGetSuccessMessage';
import { GENERIC_ERROR } from 'constants/textConstants';
import { PagePropTypes } from 'constants/proptypes';
import RETooltip from 'elements/RETooltip';
import { PATCH_PAGE } from 'ajax/endpoints';
import { pageLink } from 'utilities/getPageLinks';

import { Flex, Button, Popover, LiveText, /*UnpublishButton, */ Text, IconButton } from './PublishButton.styled';
import PublishModal from './PublishModal';
import SuccessfulPublishModal from './SuccessfulPublishModal';

const PublishButton = ({ page, setPage, className, alert, requestPatchPage }) => {
  const { open: showTooltip, handleClose: handleCloseTooltip, handleOpen: handleOpenTooltip } = useModal();
  const { open, handleClose, handleOpen } = useModal();
  const {
    open: openSuccessfulPublishModal,
    handleClose: handleCloseSuccessfulPublishModal,
    handleOpen: handleOpenSuccessfulPublishModal
  } = useModal();
  const [loading, setLoading] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const showPopover = Boolean(anchorEl);
  const disabled = !page?.payment_provider?.stripe_verified;
  const isPublished = pageHasBeenPublished(page);

  const handleOpenPopover = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClosePopover = () => {
    setAnchorEl(null);
  };

  const patchPage = useCallback(
    async (data) => {
      setLoading(true);
      requestPatchPage(
        {
          method: 'PATCH',
          url: `${PATCH_PAGE}${page.id}/`,
          data
        },
        {
          onSuccess: ({ data }) => {
            const successMessage = getSuccessMessage(page, data);
            if (pageHasBeenPublished(data)) {
              handleOpenSuccessfulPublishModal();
            } else {
              alert.success(successMessage);
            }
            setPage(data);
            setLoading(false);
            handleClose();
            handleClosePopover();
          },
          onFailure: (e) => {
            alert.error(GENERIC_ERROR);
            setLoading(false);
          }
        }
      );
    },
    [alert, handleClose, handleOpenSuccessfulPublishModal, page, requestPatchPage, setPage]
  );

  // TODO: update handleUnpublish when implementation of "Unpublish" functionality is decided
  // const handleUnpublish = () => {
  //   patchPage({ published_date: 'TDB' });
  // };

  const handlePublish = (data) => {
    patchPage({ ...data, published_date: new Date() });
  };

  if (!page) return null;

  return (
    <Flex className={className}>
      <RETooltip
        title={
          <p style={{ color: 'white', margin: 0 }}>
            Connect to Stripe to publish page. <br />
            Return to dashboard to connect.
          </p>
        }
        placement="bottom-end"
        open={showTooltip && disabled}
        onClose={handleCloseTooltip}
        onOpen={handleOpenTooltip}
      >
        {/* Disabled elements do not fire events. Need the DIV over button for tooltip to listen to events. */}
        <div data-testid="publish-button-wrapper">
          <Button
            variant="contained"
            onClick={isPublished ? handleOpenPopover : handleOpen}
            active={showPopover ? 'true' : ''}
            aria-label={`${isPublished ? 'Published' : 'Publish'} page ${page?.name}`}
            disabled={disabled}
            {...(isPublished && {
              startIcon: <CheckCircleOutlineIcon />,
              published: 'true',
              variant: 'outlined'
            })}
          >
            {isPublished ? 'Published' : 'Publish'}
          </Button>
        </div>
      </RETooltip>
      {open && (
        <PublishModal open={open} onClose={handleClose} page={page} onPublish={handlePublish} loading={loading} />
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
          <RETooltip title="Go to Page" placement="bottom-end">
            <IconButton
              component="a"
              href={`//${pageLink(page)}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Page link"
            >
              <LaunchIcon />
            </IconButton>
          </RETooltip>
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
};

PublishButton.propTypes = {
  className: PropTypes.string,
  page: PropTypes.shape(PagePropTypes).isRequired,
  setPage: PropTypes.func,
  alert: PropTypes.any,
  requestPatchPage: PropTypes.func
};

PublishButton.defaultProps = {
  className: ''
};

export default PublishButton;
