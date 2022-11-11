import { TableCell, TableRow } from 'components/base';
import { ContributorContribution } from 'hooks/useContributorContributionList';
import PropTypes, { InferProps } from 'prop-types';
import formatCurrencyAmount from 'utilities/formatCurrencyAmount';
import formatDatetimeForDisplay from 'utilities/formatDatetimeForDisplay';
import { getFrequencyAdjective } from 'utilities/parseFrequency';
import CancelRecurringButton from './CancelRecurringButton';
import ContributionPaymentMethod from './ContributionPaymentMethod';
import { PaymentStatus } from 'components/common/PaymentStatus';
import { ValueOrPlaceholder } from 'components/common/ValueOrPlaceholder';
import { Time } from './ContributionTableRow.styled';

const ContributionTableRowPropTypes = {
  contribution: PropTypes.object.isRequired,
  onCancelRecurring: PropTypes.func.isRequired,
  onUpdateRecurringComplete: PropTypes.func.isRequired
};

export interface ContributionTableRowProps extends InferProps<typeof ContributionTableRowPropTypes> {
  contribution: ContributorContribution;
  onCancelRecurring: (contribution: ContributorContribution) => Promise<void>;
  onUpdateRecurringComplete: (contribution: ContributorContribution) => void;
}

export function ContributionTableRow({
  contribution,
  onCancelRecurring,
  onUpdateRecurringComplete
}: ContributionTableRowProps) {
  // Data attributes on the row are for Cypress compatibility.

  return (
    <TableRow data-testid="donation-row" data-donationid={contribution.id}>
      <TableCell data-testid="created-cell">
        <ValueOrPlaceholder value={contribution.created}>
          {formatDatetimeForDisplay(contribution.created)}{' '}
          <Time>{formatDatetimeForDisplay(contribution.created, true)}</Time>
        </ValueOrPlaceholder>
      </TableCell>
      <TableCell data-testid="amount-cell">
        <ValueOrPlaceholder value={contribution.amount}>{formatCurrencyAmount(contribution.amount)}</ValueOrPlaceholder>
      </TableCell>
      <TableCell data-testid="interval-cell" data-testcolumnaccessor="interval">
        <ValueOrPlaceholder value={contribution.interval}>
          {getFrequencyAdjective(contribution.interval)}
        </ValueOrPlaceholder>
      </TableCell>
      <TableCell data-testid="last-payment-cell">
        <ValueOrPlaceholder value={contribution.last_payment_date}>
          {formatDatetimeForDisplay(contribution.last_payment_date)}{' '}
          <Time>{formatDatetimeForDisplay(contribution.last_payment_date, true)}</Time>
        </ValueOrPlaceholder>
      </TableCell>
      <TableCell>
        <ContributionPaymentMethod
          contribution={contribution}
          onUpdateComplete={() => onUpdateRecurringComplete(contribution)}
        />
      </TableCell>
      <TableCell data-testid="status-cell">
        {contribution.status && <PaymentStatus status={contribution.status} />}
      </TableCell>
      <TableCell>
        <CancelRecurringButton contribution={contribution} onCancel={onCancelRecurring} />
      </TableCell>
    </TableRow>
  );
}

ContributionTableRow.propTypes = ContributionTableRowPropTypes;
export default ContributionTableRow;
