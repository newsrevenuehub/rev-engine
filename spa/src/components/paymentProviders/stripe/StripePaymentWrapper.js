import { useRef } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

import { HUB_STRIPE_API_PUB_KEY } from 'appSettings';
import StripePaymentForm from 'components/paymentProviders/stripe/StripePaymentForm';
import { usePage } from 'components/donationPage/DonationPage';
import GlobalLoading from 'elements/GlobalLoading';

// This element loads the Stripe `Elements` component, which the Stripe `PaymentElement` needs
// in order to have expected context. This is where we configure and load Stripe with the connected
// account for this page.
function StripePaymentWrapper() {
  const {
    page: {
      payment_provider: { stripe_account_id: stripeAccount }
    },
    stripeClientSecret
  } = usePage();

  // we pass the connected RP's Stripe Account Id into options
  // see https://stripe.com/docs/connect/authentication#adding-the-connected-account-id-to-a-client-side-application
  // Also, we use `useRef` here with `loadStripe` because we have dynamic data (the connected Stripe account)
  // which will only be available after `usePage` runs. In the Stripe docs, they show
  // running `loadStripe` outside of the component in module level scope.
  const stripePromise = useRef(loadStripe(HUB_STRIPE_API_PUB_KEY, { stripeAccount }));

  const options = {
    clientSecret: stripeClientSecret
  };

  return stripeClientSecret ? (
    <Elements stripe={stripePromise.current} options={options}>
      <StripePaymentForm />
    </Elements>
  ) : (
    <GlobalLoading />
  );
}

export default StripePaymentWrapper;
