import { Table, TableBody } from 'components/base';
import { PortalContributionPayment } from 'hooks/usePortalContribution';
import PropTypes, { InferProps } from 'prop-types';
import formatCurrencyAmount from 'utilities/formatCurrencyAmount';
import { DetailSection } from '../DetailSection';
import { TableCell, TableHead, TableRow } from './BillingHistory.styled';
import { SectionControlButton } from '../common.styled';
import usePortal from 'hooks/usePortal';

const BillingHistoryPropTypes = {
  disabled: PropTypes.bool,
  payments: PropTypes.array.isRequired,
  onSendEmailReceipt: PropTypes.func.isRequired
};

export interface BillingHistoryProps extends InferProps<typeof BillingHistoryPropTypes> {
  payments: PortalContributionPayment[];
  onSendEmailReceipt: () => void;
}

const PAYMENT_STATUS_NAMES: Record<PortalContributionPayment['status'], string> = {
  paid: 'Paid',
  refunded: 'Refunded'
};

const dateFormatter = Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'numeric', year: 'numeric' });

export function BillingHistory({ disabled, payments, onSendEmailReceipt }: BillingHistoryProps) {
  const { page } = usePortal();
  const sendNreEmail = page?.revenue_program?.organization?.send_receipt_email_via_nre;

  return (
    <DetailSection
      disabled={disabled}
      title="Billing History"
      controls={
        sendNreEmail && <SectionControlButton onClick={onSendEmailReceipt}>Resend receipt</SectionControlButton>
      }
    >
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
              <TableCell>{dateFormatter.format(new Date(payment.transaction_time ?? payment.created))}</TableCell>
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
