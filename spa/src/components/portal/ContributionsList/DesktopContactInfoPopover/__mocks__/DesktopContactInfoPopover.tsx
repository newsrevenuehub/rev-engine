import { DesktopContactInfoPopoverProps } from '../DesktopContactInfoPopover';

const DesktopContactInfoPopover = ({ revenueProgram }: DesktopContactInfoPopoverProps) => (
  <div data-testid="mock-contact-info-popover" data-revenueProgram={JSON.stringify(revenueProgram)} />
);

export default DesktopContactInfoPopover;
