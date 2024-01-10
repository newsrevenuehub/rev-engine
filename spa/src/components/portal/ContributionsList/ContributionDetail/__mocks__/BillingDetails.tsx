import { BillingDetailsProps } from '../BillingDetails';

export const BillingDetails = ({ contribution }: BillingDetailsProps) => (
  <div data-testid="mock-billing-details" data-contribution={contribution.payment_provider_id} />
);
export default BillingDetails;
