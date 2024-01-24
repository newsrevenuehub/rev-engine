import { PaymentMethodProps } from '../PaymentMethod';

export const PaymentMethod = ({ contribution }: PaymentMethodProps) => (
  <div data-testid="mock-payment-method" data-contribution={contribution.id} />
);
export default PaymentMethod;
