import { BookmarkBorder } from '@material-ui/icons';
import PropTypes, { InferProps } from 'prop-types';
import { Link, Tooltip } from 'components/base';
import { HELP_URL } from 'constants/helperUrls';
import { MouseEvent, useState } from 'react';
import { ArrowPopover, Button, PopoverText, PopoverHeader } from './DefaultPageButton.styled';
import useModal from 'hooks/useModal';

const DefaultPageButtonPropTypes = {
  domId: PropTypes.string.isRequired
};

export type DefaultPageButtonProps = InferProps<typeof DefaultPageButtonPropTypes>;

export function DefaultPageButton({ domId }: DefaultPageButtonProps) {
  const { handleClose: handleTooltipClose, handleOpen: handleTooltipOpen, open: tooltipOpen } = useModal();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  function handleOpenPopover(event: MouseEvent) {
    setAnchorEl(event.target as HTMLElement);
  }

  return (
    <>
      <Tooltip
        disableFocusListener
        disableTouchListener
        title="Default contribution page."
        onClose={handleTooltipClose}
        onOpen={handleTooltipOpen}
        open={tooltipOpen && !anchorEl}
      >
        <Button
          aria-describedby={`${domId}-popover`}
          aria-label="Default contribution page"
          aria-pressed={!!anchorEl}
          onClick={handleOpenPopover}
        >
          <BookmarkBorder />
        </Button>
      </Tooltip>
      <ArrowPopover anchorEl={anchorEl} id={`${domId}-popover`} onClose={() => setAnchorEl(null)} open={!!anchorEl}>
        <PopoverHeader>What is a default contribution page?</PopoverHeader>
        <PopoverText>
          The default contribution page is used in several ways to streamline your branding and redirects. Your
          transactional emails, contributor portal, and default thank you page will all pull styles and settings from
          the default checkout page.
        </PopoverText>
        <PopoverText>
          Any expired contribution page links will redirect to your default page. This allows contributors to always
          find their way to your page to contribute even if a campaign has ended and the link they are following is no
          longer active.
        </PopoverText>
        <PopoverText>
          If you need technical assistance, please contact our{' '}
          <Link href={HELP_URL} target="_blank">
            Support Team
          </Link>
          .
        </PopoverText>
      </ArrowPopover>
    </>
  );
}

DefaultPageButton.propTypes = DefaultPageButtonPropTypes;
export default DefaultPageButton;
