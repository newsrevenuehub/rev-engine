import PropTypes, { InferProps } from 'prop-types';
import { Modal, ModalHeader } from 'components/base';
import IntegrationCardHeader from '../../IntegrationCardHeader';
import { cardProps } from '../shared-props';
import FreePlanContent from './FreePlanContent';
import { EnginePlan } from 'hooks/useContributionPage';

const ActiveCampaignModalPropTypes = {
  onClose: PropTypes.func.isRequired,
  open: PropTypes.bool
};

export interface ActiveCampaignModalProps extends InferProps<typeof ActiveCampaignModalPropTypes> {
  onClose: () => void;
  orgPlan: EnginePlan['name'];
}

export function ActiveCampaignModal({ onClose, open, orgPlan }: ActiveCampaignModalProps) {
  return (
    <Modal width={566} open={!!open} onClose={onClose} aria-label="ActiveCampaign Integration">
      <ModalHeader onClose={onClose}>
        <IntegrationCardHeader {...cardProps} />
      </ModalHeader>
      <>{orgPlan === 'FREE' && <FreePlanContent onClose={onClose} />}</>
    </Modal>
  );
}

ActiveCampaignModal.propTypes = ActiveCampaignModalPropTypes;
export default ActiveCampaignModal;
