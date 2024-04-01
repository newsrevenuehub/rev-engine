import { MouseEvent, useMemo, useState } from 'react';
import PropTypes, { InferProps } from 'prop-types';
import LinkIcon from '@material-ui/icons/Link';
import CopyInputButton from 'components/common/Button/CopyInputButton';
import { useEditablePageContext } from 'hooks/useEditablePage';
import { pageLink, portalLink } from 'utilities/getPageLinks';
import { pageIsPublished } from 'utilities/editPageGetSuccessMessage';
import { Flex, Button, Popover, Text } from './GrabLink.styled';

const GrabLinkPropTypes = {
  className: PropTypes.string
};

export type GrabLinkProps = InferProps<typeof GrabLinkPropTypes>;

const GrabLink = ({ className }: GrabLinkProps) => {
  const { page } = useEditablePageContext();
  const [copied, setCopied] = useState('');
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const id = open ? 'grab link popover' : undefined;
  const isPublished = useMemo(() => page && pageIsPublished(page), [page]);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  if (!isPublished) {
    return null;
  }

  return (
    <Flex className={className!}>
      <Button startIcon={<LinkIcon />} onClick={handleClick} aria-label="Grab link" aria-describedby={id}>
        Grab link
      </Button>
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={() => {
          handleClose();
          setCopied('');
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
          link={pageLink(page!)}
          copied={copied}
          setCopied={setCopied}
          data-testid="copy-contribution-page-link"
        />
        <CopyInputButton
          title="Contributor Portal Link"
          link={portalLink(page!)}
          copied={copied}
          setCopied={setCopied}
        />
      </Popover>
    </Flex>
  );
};

GrabLink.propTypes = GrabLinkPropTypes;
export default GrabLink;
