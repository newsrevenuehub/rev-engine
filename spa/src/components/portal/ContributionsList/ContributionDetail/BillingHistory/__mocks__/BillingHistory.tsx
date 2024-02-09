import { BillingHistoryProps } from '..';

export const BillingHistory = ({ disabled, payments }: BillingHistoryProps) => (
  <div data-testid="mock-billing-history" data-disabled={disabled} data-payments={JSON.stringify(payments)} />
);
export default BillingHistory;
