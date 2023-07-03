import { AudienceListModalProps } from '../AudienceListModal';

const AudienceListModal = ({ open }: AudienceListModalProps) => {
  return <>{open && <div data-testid="mock-audience-list-modal" />}</>;
};

export default AudienceListModal;
