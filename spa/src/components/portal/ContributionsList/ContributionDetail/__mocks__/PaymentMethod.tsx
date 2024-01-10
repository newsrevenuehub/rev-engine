import { PaymentMethodProps } from '../PaymentMethod';

export const PaymentMethod = ({ contribution }: PaymentMethodProps) => (
  <div data-testid="mock-payment-method" data-contribution={contribution.payment_provider_id} />
);
export default PaymentMethod;
