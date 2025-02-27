import { MailchimpModalProps } from '../MailchimpModal';

const MailchimpModal = ({ open, onClose }: MailchimpModalProps) => {
  return (
    <>
      {open && (
        <div data-testid="mock-mailchimp-modal">
          <button onClick={onClose} data-testid="mock-mailchimp-modal-close">
            mailchimp-modal-close
          </button>
        </div>
      )}
    </>
  );
};

export default MailchimpModal;
