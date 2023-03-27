import { RevenueProgram } from 'hooks/useContributionPage';

type AudienceListModalProps = {
  open: boolean;
  revenueProgram?: RevenueProgram;
};

const AudienceListModal = ({ open, revenueProgram }: AudienceListModalProps) => {
  return <>{open && <div data-testid="mock-audience-list-modal">{revenueProgram}</div>}</>;
};

export default AudienceListModal;
