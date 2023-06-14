const PublishModal = ({ onClose, onPublish, open }) => (
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
