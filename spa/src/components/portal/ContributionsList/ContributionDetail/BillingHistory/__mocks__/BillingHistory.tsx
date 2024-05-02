import { BillingHistoryProps } from '..';

export const BillingHistory = ({ disabled, payments, onSendEmailReceipt }: BillingHistoryProps) => (
  <div data-testid="mock-billing-history" data-disabled={disabled} data-payments={JSON.stringify(payments)}>
    <button onClick={onSendEmailReceipt}>Resend receipt</button>
  </div>
);
export default BillingHistory;
