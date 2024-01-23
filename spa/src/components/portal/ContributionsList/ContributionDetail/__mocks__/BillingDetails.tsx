import { BillingDetailsProps } from '../BillingDetails';

export const BillingDetails = ({ contribution }: BillingDetailsProps) => (
  <div data-testid="mock-billing-details" data-contribution={contribution.id} />
);
export default BillingDetails;
