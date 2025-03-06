import PropTypes, { InferProps } from 'prop-types';
import { Modal, ModalHeader } from 'components/base';
import IntegrationCardHeader from '../../IntegrationCardHeader';
import { cardProps } from '../shared-props';
import FreePlanContent from './FreePlanContent';
import { EnginePlan } from 'hooks/useContributionPage';
import { CorePlanContent } from './CorePlanContent';

const ActiveCampaignModalPropTypes = {
  onClose: PropTypes.func.isRequired,
  onStartCoreConnection: PropTypes.func.isRequired,
  open: PropTypes.bool
};

export interface ActiveCampaignModalProps extends InferProps<typeof ActiveCampaignModalPropTypes> {
  onClose: () => void;
  onStartCoreConnection: () => void;
  orgPlan: EnginePlan['name'];
}

/**
 * This modal shows general info about the ActiveCampaign integration and,
 * depending on the user's organization's plan, different options to proceed.
 */
export function ActiveCampaignModal({ onClose, onStartCoreConnection, open, orgPlan }: ActiveCampaignModalProps) {
  return (
    <Modal width={566} open={!!open} onClose={onClose} aria-label="ActiveCampaign Integration">
      <ModalHeader onClose={onClose}>
        <IntegrationCardHeader {...cardProps} />
      </ModalHeader>
      <>{orgPlan === 'FREE' && <FreePlanContent onClose={onClose} />}</>
      <>{orgPlan === 'CORE' && <CorePlanContent onClose={onClose} onStartConnection={onStartCoreConnection} />}</>
    </Modal>
  );
}

ActiveCampaignModal.propTypes = ActiveCampaignModalPropTypes;
export default ActiveCampaignModal;
