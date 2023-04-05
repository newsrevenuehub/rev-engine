import { UnpublishModalProps } from '../UnpublishModal';

export const UnpublishModal = ({ onClose, onUnpublish, open }: UnpublishModalProps) => {
  return (
    <>
      {open && (
        <div data-testid="mock-unpublish-modal">
          <button onClick={onClose}>onClose</button>
          <button onClick={onUnpublish}>onUnpublish</button>
        </div>
      )}
    </>
  );
};

export default UnpublishModal;
