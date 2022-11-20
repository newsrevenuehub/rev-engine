import CancelOutlinedIcon from '@material-ui/icons/CancelOutlined';
import ReportOutlined from '@material-ui/icons/ReportOutlined';
import PropTypes, { InferProps } from 'prop-types';
import useModal from 'hooks/useModal';
import { ModalHeader, TableButton } from './CancelRecurringButton.styled';
import { Button, Modal, ModalContent, ModalFooter } from 'components/base';
import formatCurrencyAmount from 'utilities/formatCurrencyAmount';
import { ContributorContribution } from 'hooks/useContributorContributionList';

const CancelRecurringButtonPropTypes = {
  contribution: PropTypes.object.isRequired,
  onCancel: PropTypes.func.isRequired
};

export interface CancelRecurringButtonProps extends InferProps<typeof CancelRecurringButtonPropTypes> {
  contribution: ContributorContribution;
  onCancel: (contribution: ContributorContribution) => void;
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
          Are you sure you want to cancel your recurring payment of {formatCurrencyAmount(contribution.amount)}?
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
