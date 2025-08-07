import { loadStripe, Stripe, StripeElementLocale } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import PropTypes, { InferProps } from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import { HUB_STRIPE_API_PUB_KEY } from 'appSettings';

const StripeLoaderPropTypes = {
  children: PropTypes.node,
  onError: PropTypes.func,
  stripeAccountId: PropTypes.string.isRequired,
  /**
   * The client secret used when completing a Stripe payment intent or setup
   * intent. This can be omitted if Stripe is being used for other purposes.
   */
  stripeClientSecret: PropTypes.string,
  stripeLocale: PropTypes.string.isRequired
};

export interface StripeLoaderProps extends InferProps<typeof StripeLoaderPropTypes> {
  onError?: (error: Error) => void;
  stripeLocale: StripeElementLocale;
}

// A copy/paste of StripePaymentWrapper without Material UI.

export function StripeLoader({
  children,
  onError,
  stripeAccountId,
  stripeClientSecret,
  stripeLocale
}: StripeLoaderProps) {
  const [inited, setInited] = useState(false);
  const [stripe, setStripe] = useState<Stripe | null>(null);

  // Load Stripe once we have an account ID to work with. It's important that
  // this only be done once. See
  // https://stripe.com/docs/connect/authentication#adding-the-connected-account-id-to-a-client-side-application

  useEffect(() => {
    async function init() {
      try {
        // Have to cast because TypeScript doesn't understand we checked
        // stripeAccount before running this function.
        const loadedStripe = await loadStripe(HUB_STRIPE_API_PUB_KEY, { stripeAccount: stripeAccountId });

        if (loadedStripe) {
          setStripe(loadedStripe);
        }
      } catch (error) {
        // Log it for Sentry and notify the parent.

        console.warn(error);

        if (onError) {
          onError(error as Error);
        }
      }
    }

    if (stripeAccountId && !inited) {
      setInited(true);
      init();
    }
  }, [inited, onError, stripeAccountId]);

  const options = useMemo(
    () => ({ clientSecret: stripeClientSecret ?? undefined, locale: stripeLocale }),
    [stripeClientSecret, stripeLocale]
  );

  return stripe ? (
    <Elements stripe={stripe} options={options}>
      {children}
    </Elements>
  ) : (
    <span>Loading...</span>
  );
}

StripeLoader.propTypes = StripeLoaderPropTypes;
export default StripeLoader;
