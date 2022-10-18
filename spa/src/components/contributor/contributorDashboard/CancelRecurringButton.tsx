import CancelOutlinedIcon from '@material-ui/icons/CancelOutlined';
import ReportOutlined from '@material-ui/icons/ReportOutlined';
import PropTypes, { InferProps } from 'prop-types';
import { ContributionInterval } from 'constants/contributionIntervals';
import { PaymentStatus } from 'constants/paymentStatus';
import useModal from 'hooks/useModal';
import { ModalHeader, TableButton } from './CancelRecurringButton.styled';
import { Button, Modal, ModalContent, ModalFooter } from 'components/base';
import formatCurrencyAmount from 'utilities/formatCurrencyAmount';

const CancelRecurringButtonPropTypes = {
  contribution: PropTypes.object.isRequired,
  onCancel: PropTypes.func.isRequired
};

// This is a temporary home for this type.
// TODO in DEV-489: move to hook

interface Contribution {
  id: string;
  amount: number;
  bad_actor_score?: unknown;
  bad_actor_response?: unknown;
  card_brand: string;
  contributor: number;
  contributor_email: string;
  created: string;
  currency: string;
  flagged_date?: string;
  interval: ContributionInterval;
  last4: number;
  modified: string;
  organization: number;
  payment_provider_used: string;
  payment_provider_data: unknown;
  provider_customer_id?: string;
  provider_payment_id?: string;
  provider_payment_method_id?: string;
  revenue_program: string;
  reason: string;
  status?: PaymentStatus;
}

export interface CancelRecurringButtonProps extends InferProps<typeof CancelRecurringButtonPropTypes> {
  contribution: Contribution;
  onCancel: (contribution: Contribution) => void;
}

export function CancelRecurringButton({ contribution, onCancel }: CancelRecurringButtonProps) {
  const { open, handleClose, handleOpen } = useModal();

  function handleCancelClick() {
    handleClose();
    onCancel(contribution);
  }

  if (contribution.interval === 'one_time' || contribution.status === 'canceled') {
    return null;
  }

  return (
    <>
      <TableButton startIcon={<CancelOutlinedIcon />} onClick={handleOpen} data-testid="cancel-recurring-button">
        Cancel
      </TableButton>
      <Modal aria-labelledby="cancel-payment-header" open={open} width={430}>
        <ModalHeader icon={<ReportOutlined />} onClose={handleClose}>
          <span id="cancel-payment-header">Cancel Payment</span>
        </ModalHeader>
        <ModalContent>
          Are you sure you want to cancel your recurring payment of {formatCurrencyAmount(contribution.amount)} to{' '}
          {contribution.revenue_program}?
        </ModalContent>
        <ModalFooter>
          <Button color="secondary" onClick={handleClose}>
            No, Keep Payment
          </Button>
          <Button color="error" data-testid="confirm-cancel-button" onClick={handleCancelClick}>
            Yes, Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}

CancelRecurringButton.propTypes = CancelRecurringButtonPropTypes;

export default CancelRecurringButton;
