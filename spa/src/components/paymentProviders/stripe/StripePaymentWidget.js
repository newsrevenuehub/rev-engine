import { useState, useEffect, useCallback } from 'react';
import * as S from './StripePaymentWidget.styled';

// Deps
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

// Ajax
import axios from 'ajax/axios';
import { ORG_STRIPE_ACCOUNT_ID } from 'ajax/endpoints';

// Routing
import { useParams } from 'react-router-dom';

// Children
import ElementLoading from 'components/donationPage/pageContent/ElementLoading';
import StripePaymentForm from 'components/paymentProviders/stripe/StripePaymentForm';

function StripePaymentWidget() {
  const [loading, setLoading] = useState(false);
  const [stripe, setStripe] = useState();
  const params = useParams();

  const setOrgStripeAccountId = useCallback(async () => {
    const { data } = await axios.get(ORG_STRIPE_ACCOUNT_ID, {
      params: { revenue_program_slug: params.revProgramSlug }
    });
    const stripeAccount = data.stripe_account_id;
    setStripe(loadStripe('pk_test_31XWC5qhlLi9UkV1OzsI634W', { stripeAccount }));
  }, [params.revProgramSlug]);

  useEffect(() => {
    setOrgStripeAccountId();
  }, [setOrgStripeAccountId]);

  return (
    <S.StripePaymentWidget>
      {(loading || !stripe) && <ElementLoading />}
      {stripe && (
        <Elements stripe={stripe}>
          <StripePaymentForm loading={loading} setLoading={setLoading} />
        </Elements>
      )}
    </S.StripePaymentWidget>
  );
}

export default StripePaymentWidget;
