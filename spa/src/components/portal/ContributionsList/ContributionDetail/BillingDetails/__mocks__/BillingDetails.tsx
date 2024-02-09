import { BillingDetailsProps } from '..';

export const BillingDetails = ({ contribution, disabled }: BillingDetailsProps) => (
  <div data-testid="mock-billing-details" data-contribution={contribution.id} data-disabled={disabled} />
);
export default BillingDetails;
