import PropTypes, { InferProps } from 'prop-types';
import { Modal, ModalHeader } from 'components/base';
import IntegrationCardHeader from '../../IntegrationCardHeader';
import { cardProps } from '../shared-props';
import FreePlanContent from './FreePlanContent';
import { EnginePlan } from 'hooks/useContributionPage';
import { PaidPlanContent } from './PaidPlanContent';

const ActiveCampaignModalPropTypes = {
  connected: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onStartConnection: PropTypes.func.isRequired,
  open: PropTypes.bool
};

export interface ActiveCampaignModalProps extends InferProps<typeof ActiveCampaignModalPropTypes> {
  onClose: () => void;
  onStartConnection: () => void;
  orgPlan: EnginePlan['name'];
}

/**
 * This modal shows general info about the ActiveCampaign integration and,
 * depending on the user's organization's plan, different options to proceed.
 */
export function ActiveCampaignModal({
  connected,
  onClose,
  onStartConnection,
  open,
  orgPlan
}: ActiveCampaignModalProps) {
  return (
    <Modal
      width={566}
      open={!!open}
      onClose={onClose}
      aria-label="ActiveCampaign Integration"
      data-connected={connected}
    >
      <ModalHeader onClose={onClose}>
        <IntegrationCardHeader {...cardProps} />
      </ModalHeader>
      <>
        {orgPlan === 'FREE' ? (
          <FreePlanContent onClose={onClose} />
        ) : (
          <PaidPlanContent connected={connected} onClose={onClose} onStartConnection={onStartConnection} />
        )}
      </>
    </Modal>
  );
}

ActiveCampaignModal.propTypes = ActiveCampaignModalPropTypes;
export default ActiveCampaignModal;
