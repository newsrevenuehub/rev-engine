import { StripePaymentFormProps } from '../StripePaymentForm';

export function StripePaymentForm({ payment }: StripePaymentFormProps) {
  return <div data-testid="mock-stripe-payment-form" data-payment={JSON.stringify(payment)} />;
}

export default StripePaymentForm;
