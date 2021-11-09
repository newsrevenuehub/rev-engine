import { useState, useEffect } from 'react';
import * as S from './StripePayment.styled';

import { HUB_STRIPE_PUBLISHABLE_KEY } from 'settings';

// Deps
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

// Children
import ElementLoading from 'components/donationPage/pageContent/ElementLoading';
import StripePaymentForm from 'components/paymentProviders/stripe/StripePaymentForm';

function StripePayment({ offerPayFees, stripeAccountId }) {
  const [loading, setLoading] = useState(false);
  const [stripe, setStripe] = useState();

  useEffect(() => {
    if (stripeAccountId) setStripe(loadStripe(HUB_STRIPE_PUBLISHABLE_KEY, { stripeAccount: stripeAccountId }));
  }, [stripeAccountId]);

  return (
    <S.StripePayment>
      {(loading || !stripe) && <ElementLoading />}
      {stripe && (
        <Elements stripe={stripe}>
          <StripePaymentForm loading={loading} setLoading={setLoading} offerPayFees={offerPayFees} />
        </Elements>
      )}
    </S.StripePayment>
  );
}

export default StripePayment;
