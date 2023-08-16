import { MailchimpModalProps } from '../MailchimpModal';

const MailchimpModal = ({ open, onClose, user }: MailchimpModalProps) => {
  return (
    <>
      {open && (
        <div data-testid="mock-mailchimp-modal" data-user={JSON.stringify(user)}>
          <button onClick={onClose} data-testid="mock-mailchimp-modal-close">
            mailchimp-modal-close
          </button>
        </div>
      )}
    </>
  );
};

export default MailchimpModal;
