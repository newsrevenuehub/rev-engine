import { Skeleton } from '@material-ui/lab';
import PropTypes, { InferProps } from 'prop-types';
import { useMemo } from 'react';
import { Link, Table, TableBody } from 'components/base';
import usePortal from 'hooks/usePortal';
import { PortalContributionPayment } from 'hooks/usePortalContribution';
import formatCurrencyAmount from 'utilities/formatCurrencyAmount';
import { DetailSection } from '../DetailSection';
import { EmptyBillingHistory, TableCell, TableHead, TableRow } from './BillingHistory.styled';
import { SectionControlButton } from '../common.styled';

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
  const hasPayments = payments.length > 0;
  const sortedPayments = useMemo(
    () =>
      payments.sort((a, b) => {
        // Sort by effective date descending (e.g. most recent first).

        const aDate = new Date(a.transaction_time ?? a.created);
        const bDate = new Date(b.transaction_time ?? b.created);

        return bDate.getTime() - aDate.getTime();
      }),
    [payments]
  );

  const renderEmptyBillingHistory = () => (
    <tr>
      <td colSpan={3}>
        {page?.revenue_program.name ? (
          <EmptyBillingHistory>
            Please contact {page?.revenue_program.name}
            {page?.revenue_program.contact_email ? (
              <>
                {' '}
                at{' '}
                <Link href={`mailto:${page?.revenue_program.contact_email}`}>
                  {page?.revenue_program.contact_email}
                </Link>
              </>
            ) : (
              ''
            )}{' '}
            for billing history and prior receipts for this contribution.
          </EmptyBillingHistory>
        ) : (
          <Skeleton variant="rect" height={20} />
        )}
      </td>
    </tr>
  );

  return (
    <DetailSection
      disabled={disabled}
      title="Billing History"
      controls={
        sendNreEmail && (
          <SectionControlButton $cursorNotAllowed onClick={onSendEmailReceipt} disabled={!hasPayments}>
            Resend receipt
          </SectionControlButton>
        )
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
          {hasPayments
            ? sortedPayments.map((payment, index) => (
                <TableRow key={index}>
                  <TableCell>{dateFormatter.format(new Date(payment.transaction_time ?? payment.created))}</TableCell>
                  <TableCell>
                    {formatCurrencyAmount(
                      payment.status === 'refunded' ? payment.amount_refunded : payment.gross_amount_paid
                    )}
                  </TableCell>
                  <TableCell>{PAYMENT_STATUS_NAMES[payment.status]}</TableCell>
                </TableRow>
              ))
            : renderEmptyBillingHistory()}
        </TableBody>
      </Table>
    </DetailSection>
  );
}

BillingHistory.propTypes = BillingHistoryPropTypes;
export default BillingHistory;
