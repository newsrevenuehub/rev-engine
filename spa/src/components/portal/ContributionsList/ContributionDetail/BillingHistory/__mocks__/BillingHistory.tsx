import { BillingHistoryProps } from '..';

export const BillingHistory = ({ disabled, payments, sendEmailReceipt }: BillingHistoryProps) => (
  <div data-testid="mock-billing-history" data-disabled={disabled} data-payments={JSON.stringify(payments)}>
    <button onClick={sendEmailReceipt}>Resend receipt</button>
  </div>
);
export default BillingHistory;
