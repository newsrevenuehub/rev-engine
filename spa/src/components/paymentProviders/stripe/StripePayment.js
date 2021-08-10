import { useState, useEffect, useCallback } from 'react';
import * as S from './StripePayment.styled';

import { HUB_STRIPE_PUBLISHABLE_KEY } from 'App';

// Deps
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

// Ajax
import useRequest from 'hooks/useRequest';
import { ORG_STRIPE_ACCOUNT_ID } from 'ajax/endpoints';

// Routing
import { useParams } from 'react-router-dom';

// Children
import ElementLoading from 'components/donationPage/pageContent/ElementLoading';
import StripePaymentForm from 'components/paymentProviders/stripe/StripePaymentForm';

function StripePayment({ offerPayFees }) {
  const [loading, setLoading] = useState(false);
  const [stripe, setStripe] = useState();
  const requestOrgStripeAccountId = useRequest();
  const params = useParams();

  const setOrgStripeAccountId = useCallback(async () => {
    const requestParams = { revenue_program_slug: params.revProgramSlug };
    requestOrgStripeAccountId(
      { method: 'GET', url: ORG_STRIPE_ACCOUNT_ID, params: requestParams },
      {
        onSuccess: ({ data }) => {
          const stripeAccount = data.stripe_account_id;
          setStripe(loadStripe(HUB_STRIPE_PUBLISHABLE_KEY, { stripeAccount }));
        }
      }
    );
  }, [params.revProgramSlug]);

  useEffect(() => {
    setOrgStripeAccountId();
  }, [setOrgStripeAccountId]);

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
