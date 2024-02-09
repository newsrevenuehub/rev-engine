import PropTypes, { InferProps } from 'prop-types';
import { Table, TableBody } from 'components/base';
import { PortalContributionPayment } from 'hooks/usePortalContribution';
import formatCurrencyAmount from 'utilities/formatCurrencyAmount';
import { TableCell, TableHead, TableRow } from './BillingHistory.styled';
import { DetailSection } from '../DetailSection';

const BillingHistoryPropTypes = {
  disabled: PropTypes.bool,
  payments: PropTypes.array.isRequired
};

export interface BillingHistoryProps extends InferProps<typeof BillingHistoryPropTypes> {
  payments: PortalContributionPayment[];
}

const PAYMENT_STATUS_NAMES: Record<PortalContributionPayment['status'], string> = {
  paid: 'Paid',
  refunded: 'Refunded'
};

const dateFormatter = Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'numeric', year: 'numeric' });

export function BillingHistory({ disabled, payments }: BillingHistoryProps) {
  return (
    <DetailSection disabled={disabled} title="Billing History">
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell>Amount</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {payments.map((payment, index) => (
            <TableRow key={index}>
              <TableCell>{dateFormatter.format(new Date(payment.created))}</TableCell>
              <TableCell>{formatCurrencyAmount(payment.gross_amount_paid)}</TableCell>
              <TableCell>{PAYMENT_STATUS_NAMES[payment.status]}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DetailSection>
  );
}

BillingHistory.propTypes = BillingHistoryPropTypes;
export default BillingHistory;
