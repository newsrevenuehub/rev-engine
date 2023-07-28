import { StripePricingTableProps } from '../StripePricingTable';

export const StripePricingTable = ({
  clientReferenceId,
  customerEmail,
  pricingTableId,
  publishableKey
}: StripePricingTableProps) => (
  <div
    data-testid="mock-stripe-pricing-table"
    data-client-reference-id={clientReferenceId}
    data-customer-email={customerEmail}
    data-pricing-table-id={pricingTableId}
    data-publishable-key={publishableKey}
  />
);
