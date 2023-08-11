import { StripePaymentWrapperProps } from '../StripePaymentWrapper';

export function StripePaymentWrapper({
  children,
  onError,
  stripeAccountId,
  stripeClientSecret
}: StripePaymentWrapperProps) {
  return (
    <div
      data-testid="mock-stripe-payment-wrapper"
      data-stripe-account-id={stripeAccountId}
      data-stripe-client-secret={stripeClientSecret}
    >
      {onError && <button onClick={() => onError(new Error())}>onError</button>}
      {children}
    </div>
  );
}

export default StripePaymentWrapper;
