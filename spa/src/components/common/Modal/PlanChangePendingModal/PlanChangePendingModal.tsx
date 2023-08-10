import { Update } from '@material-ui/icons';
import PropTypes, { InferProps } from 'prop-types';
import { Button, Modal, ModalFooter, ModalHeader } from 'components/base';
import { PRICING_URL } from 'constants/helperUrls';
import { PLAN_LABELS, PLAN_NAMES } from 'constants/orgPlanConstants';
import { HeaderIcon, ModalContent } from './PlanChangePendingModal.styled';

const PlanChangePendingModalPropTypes = {
  futurePlan: PropTypes.oneOf([PLAN_NAMES.CORE, PLAN_NAMES.PLUS]).isRequired,
  onClose: PropTypes.func.isRequired,
  open: PropTypes.bool
};

export interface PlanChangePendingModalProps extends InferProps<typeof PlanChangePendingModalPropTypes> {
  onClose: () => void;
}

export function PlanChangePendingModal({ futurePlan, onClose, open }: PlanChangePendingModalProps) {
  function handleViewCoreFeaturesClick() {
    onClose();
    window.open(PRICING_URL, '_blank');
  }

  return (
    <Modal onClose={onClose} open={!!open}>
      <ModalHeader
        icon={
          <HeaderIcon>
            <Update />
          </HeaderIcon>
        }
        onClose={onClose}
      >
        Upgrade Pending
      </ModalHeader>
      <ModalContent>
        <p>
          <strong>Your {PLAN_LABELS[futurePlan]} features are on the way!</strong>
        </p>
        <p>
          We're working on upgrading your account. Please allow 1-2 business days. We'll notify you once you've been
          upgraded.
        </p>
      </ModalContent>
      <ModalFooter>
        <Button color="secondary" onClick={onClose}>
          Close
        </Button>
        {futurePlan === PLAN_NAMES.CORE && (
          <Button color="primaryDark" onClick={handleViewCoreFeaturesClick}>
            View Core Features
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
}

PlanChangePendingModal.propTypes = PlanChangePendingModalPropTypes;
export default PlanChangePendingModal;
