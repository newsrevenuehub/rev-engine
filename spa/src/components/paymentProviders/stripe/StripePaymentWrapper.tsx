import PropTypes, { InferProps } from 'prop-types';
import { useEffect, useState } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

import { HUB_STRIPE_API_PUB_KEY } from 'appSettings';
import StripePaymentForm from 'components/paymentProviders/stripe/StripePaymentForm';
import { usePage } from 'components/donationPage/DonationPage';
import GlobalLoading from 'elements/GlobalLoading';

const StripePaymentWrapperPropTypes = {
  onError: PropTypes.func
};

export interface StripePaymentWrapperProps extends InferProps<typeof StripePaymentWrapperPropTypes> {
  onError?: (error: Error) => void;
}

// This element loads the Stripe `Elements` component, which the Stripe `PaymentElement` needs
// in order to have expected context. This is where we configure and load Stripe with the connected
// account for this page.
function StripePaymentWrapper({ onError }: StripePaymentWrapperProps) {
  const {
    page: {
      payment_provider: { stripe_account_id: stripeAccount }
    },
    stripeClientSecret
  } = usePage();
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
        const loadedStripe = await loadStripe(HUB_STRIPE_API_PUB_KEY, { stripeAccount: stripeAccount as string });

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

    if (stripeAccount && !inited) {
      setInited(true);
      init();
    }
  }, [inited, onError, stripeAccount]);

  const options = {
    clientSecret: stripeClientSecret
  };

  return stripeAccount ? (
    <Elements stripe={stripe} options={options}>
      <StripePaymentForm />
    </Elements>
  ) : (
    <GlobalLoading />
  );
}

StripePaymentWrapper.propTypes = StripePaymentWrapperPropTypes;
export default StripePaymentWrapper;
