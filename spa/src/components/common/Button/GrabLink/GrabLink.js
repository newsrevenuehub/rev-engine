import { useState } from 'react';
import PropTypes from 'prop-types';

import { pageIsPublished } from 'utilities/editPageGetSuccessMessage';
import LinkIcon from '@material-ui/icons/Link';

import CopyInputButton from 'components/common/Button/CopyInputButton';
import { pageLink, portalLink } from 'utilities/getPageLinks';
import { Flex, Button, Popover, Text } from './GrabLink.styled';
import { PagePropTypes } from 'constants/propTypes';

const GrabLink = ({ page, className }) => {
  const [copied, setCopied] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const id = open ? 'grab link popover' : undefined;
  const isPublished = page && pageIsPublished(page);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  if (!isPublished) return null;

  return (
    <Flex className={className}>
      <Button startIcon={<LinkIcon />} onClick={handleClick} aria-label="Grab link" aria-describedby={id}>
        Grab link
      </Button>
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={() => {
          handleClose();
          setCopied(null);
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right'
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right'
        }}
      >
        <Text>Copy the links to update your website, emails, and other online platforms.</Text>
        <CopyInputButton
          title="Contribution Page Link"
          link={pageLink(page)}
          copied={copied}
          setCopied={setCopied}
          data-testid="copy-contribution-page-link"
        />
        <CopyInputButton
          title="Contributor Portal Link"
          link={portalLink(page)}
          copied={copied}
          setCopied={setCopied}
        />
      </Popover>
    </Flex>
  );
};

GrabLink.propTypes = {
  className: PropTypes.string,
  page: PropTypes.shape(PagePropTypes)
};

GrabLink.defaultProps = {
  className: '',
  page: undefined
};

export default GrabLink;
