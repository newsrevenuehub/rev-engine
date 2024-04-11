import { ContactInfoPopoverProps } from '../ContactInfoPopover';

const ContactInfoPopover = ({ revenueProgram }: ContactInfoPopoverProps) => (
  <div data-testid="mock-contact-info-popover" data-revenueProgram={JSON.stringify(revenueProgram)} />
);

export default ContactInfoPopover;
