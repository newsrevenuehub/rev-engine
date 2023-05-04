import { MaxPagesPublishedModalProps } from '../MaxPagesPublishedModal';

export const MaxPagesPublishedModal = ({ onClose, open }: MaxPagesPublishedModalProps) => (
  <>
    {open && (
      <div data-testid="mock-max-pages-published-modal">
        <button onClick={onClose}>MaxPagesPublishedModal onClose</button>
      </div>
    )}
  </>
);

export default MaxPagesPublishedModal;
