const PublishModal = ({ onPublish }) => (
  <div data-testid="mock-publish-modal">
    <button onClick={() => onPublish({ slug: 'mock-slug' })}>onPublish</button>
  </div>
);

export default PublishModal;
