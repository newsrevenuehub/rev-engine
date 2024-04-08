import { ContactInfoPopoverProps } from '../ContactInfoPopover';

const ContactInfoPopover = ({ page }: ContactInfoPopoverProps) => (
  <div data-testid="mock-contact-info-popover" data-page={JSON.stringify(page)} />
);

export default ContactInfoPopover;
