import { StripePaymentWrapperProps } from '../StripePaymentWrapper';

export function StripePaymentWrapper({
  children,
  onError,
  stripeAccountId,
  stripeClientSecret,
  stripeLocale
}: StripePaymentWrapperProps) {
  return (
    <div
      data-testid="mock-stripe-payment-wrapper"
      data-stripe-account-id={stripeAccountId}
      data-stripe-client-secret={stripeClientSecret}
      data-stripe-locale={stripeLocale}
    >
      {onError && <button onClick={() => onError(new Error())}>onError</button>}
      <div data-testid="mock-stripe-payment-wrapper-children">{children}</div>
    </div>
  );
}

export default StripePaymentWrapper;
