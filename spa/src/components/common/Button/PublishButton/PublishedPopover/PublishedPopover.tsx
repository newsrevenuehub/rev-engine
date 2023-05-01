import FiberManualRecordIcon from '@material-ui/icons/FiberManualRecord';
import LaunchIcon from '@material-ui/icons/Launch';
import PropTypes, { InferProps } from 'prop-types';
import { Button, Tooltip } from 'components/base';
import { ContributionPage } from 'hooks/useContributionPage';
import formatDatetimeForDisplay from 'utilities/formatDatetimeForDisplay';
import { pageLink } from 'utilities/getPageLinks';
import { IconButton, LiveText, Popover, Text, UnpublishButtonContainer } from './PublishedPopover.styled';
import { Divider } from '@material-ui/core';

const PublishedPopoverPropTypes = {
  anchorEl: PropTypes.instanceOf(Element),
  onClose: PropTypes.func.isRequired,
  onUnpublish: PropTypes.func.isRequired,
  open: PropTypes.bool.isRequired,
  page: PropTypes.object.isRequired
};

export interface PublishedPopoverProps extends InferProps<typeof PublishedPopoverPropTypes> {
  onClose: () => void;
  onUnpublish: () => void;
  page: ContributionPage;
}

export function PublishedPopover({ anchorEl, onClose, onUnpublish, open, page }: PublishedPopoverProps) {
  return (
    <Popover
      classes={{ paper: 'NrePopoverPaper' }}
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
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
      <Text data-testid="publish-date">
        {formatDatetimeForDisplay(page.published_date)} at {formatDatetimeForDisplay(page.published_date, true)}
      </Text>
      <Divider />
      <UnpublishButtonContainer>
        <Button color="error" onClick={onUnpublish}>
          Unpublish
        </Button>
      </UnpublishButtonContainer>
    </Popover>
  );
}

PublishedPopover.propTypes = PublishedPopoverPropTypes;
export default PublishedPopover;
