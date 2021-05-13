import { useState, useEffect, useCallback } from 'react';

import * as S from './StripeProvider.styled';
import StripeWordmark from 'assets/images/stripe_wordmark-blurple_sm.png';

// Deps
import { useAlert } from 'react-alert';

// State
import { PP_STATES } from 'components/connect/BaseProviderInfo';

// AJAX
import axios from 'ajax/axios';
import { STRIPE_CONFIRMATION } from 'ajax/endpoints';

// Children
import Spinner from 'elements/Spinner';
import StripeConnect from 'components/connect/stripe/StripeConnect';

function StripeProvider() {
  const alert = useAlert();
  const [stripeState, setStripeState] = useState();
  const [isLoading, setIsLoading] = useState(false);

  const getStripeVerification = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.post(STRIPE_CONFIRMATION);
      if (data.status === 'connected') {
        setStripeState(PP_STATES.CONNECTED);
      } else if (data.status === 'restricted') {
        setStripeState(PP_STATES.RESTRICTED);
      } else if (data.status === 'not_connected') {
        setStripeState(PP_STATES.NOT_CONNECTED);
      }
      setIsLoading(false);
    } catch (e) {
      if (e.response.data.status === 'failed') {
        setStripeState(PP_STATES.FAILED);
      } else {
        alert.error('There was a problem verifying your Stripe connection. We have been notified.');
      }
      setIsLoading(false);
    }
  }, [setStripeState, alert]);

  // Get Connection Status
  useEffect(() => {
    getStripeVerification();
  }, [getStripeVerification]);

  console.log('stripeState: ', stripeState);

  return (
    <S.StripeProvider
      logo={StripeWordmark}
      providerStatus={stripeState}
      isLoading={isLoading}
      data-testid="stripe-provider"
    >
      {isLoading && <Spinner />}
      {!isLoading && stripeState === PP_STATES.NOT_CONNECTED && <StripeConnect />}
      {!isLoading && stripeState === PP_STATES.RESTRICTED && <StripeRestricted />}
      {!isLoading && stripeState === PP_STATES.FAILED && <StripeConnect />}
      {!isLoading && stripeState === PP_STATES.CONNECTED && <StripeConnected />}
    </S.StripeProvider>
  );
}

function StripeRestricted() {
  return (
    <S.StripeRestricted data-testid="stripe-restricted">
      Stripe needs more information before you can accept payments. Visit your{' '}
      <a href="https://dashboard.stripe.com/dashboard" target="_blank" rel="noopener noreferrer">
        Stripe dashboard
      </a>{' '}
      to complete registration.
    </S.StripeRestricted>
  );
}

function StripeConnected() {
  return <S.StripeConnected data-testid="stripe-connected">Connected</S.StripeConnected>;
}

export default StripeProvider;
