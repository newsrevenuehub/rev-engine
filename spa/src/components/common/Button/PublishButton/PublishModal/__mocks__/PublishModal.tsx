import { PublishModalProps } from '../PublishModal';

export const PublishModal = ({ onClose, onPublish, open }: PublishModalProps) => (
  <>
    {open && (
      <div data-testid="mock-publish-modal">
        <button onClick={() => onPublish({ slug: 'mock-slug' })}>onPublish</button>
        <button onClick={onClose}>PublishModal onClose</button>
      </div>
    )}
  </>
);

export default PublishModal;
