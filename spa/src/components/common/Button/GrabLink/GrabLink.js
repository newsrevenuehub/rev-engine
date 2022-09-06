import { useState } from 'react';
import PropTypes from 'prop-types';

import { Flex, Button, Popover, Text, Title, Input, CopyButton } from './GrabLink.styled';
import CheckIcon from '@material-ui/icons/Check';
import LinkIcon from '@material-ui/icons/Link';
import getDomain from 'utilities/getDomain';

const GrabLink = ({ page, className }) => {
  const [copied, setCopied] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const id = open ? 'grab link popover' : undefined;
  const domain = getDomain(window.location.host);

  const pageLink = `${page?.revenue_program?.slug}.${domain}/${page?.slug}`;
  const portalLink = `${page?.revenue_program?.slug}.${domain}/contributor`;

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  if (!page?.published_date) return null;

  const renderCopyButton = (title, link) => {
    const showCopied = copied === link;
    return (
      <div>
        <Title>{title}</Title>
        <div style={{ display: 'flex' }}>
          <Input aria-label={link} value={link} onChange={() => {}} />
          <CopyButton
            onClick={() => {
              navigator.clipboard.writeText(link);
              setCopied(link);
            }}
            aria-label={`${showCopied ? 'Copied' : 'Copy'} ${title}`}
            copied={showCopied ? 'true' : undefined}
          >
            {showCopied ? (
              <>
                Copied <CheckIcon style={{ width: 18, height: 18, marginLeft: 4 }} />
              </>
            ) : (
              'Copy'
            )}
          </CopyButton>
        </div>
      </div>
    );
  };

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
        {renderCopyButton('Contribution Page Link', pageLink)}
        {renderCopyButton('Contributor Portal Link', portalLink)}
      </Popover>
    </Flex>
  );
};

GrabLink.propTypes = {
  className: PropTypes.string,
  page: PropTypes.shape({
    revenue_program: PropTypes.shape({
      slug: PropTypes.string
    }).isRequired,
    slug: PropTypes.string.isRequired,
    published_date: PropTypes.string
  }).isRequired
};

GrabLink.defaultProps = {
  className: ''
};

export default GrabLink;
