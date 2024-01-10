import { BillingHistoryProps } from '../BillingHistory';

export const BillingHistory = ({ payments }: BillingHistoryProps) => (
  <div data-testid="mock-billing-history" data-payments={JSON.stringify(payments)} />
);
export default BillingHistory;
