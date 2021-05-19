import { useState, useCallback } from 'react';
import * as S from './StripeConnect.styled';

// Deps
import { useAlert } from 'react-alert';

// AJAX
import axios from 'ajax/axios';
import { STRIPE_ONBOARDING } from 'ajax/endpoints';

// State
import { useProviderFetchContext } from 'components/connect/ProviderConnect';

// Elements
import Spinner from 'elements/Spinner';

function StripeConnect() {
  const alert = useAlert();
  const { providerConnectInProgress, setProviderConnectInProgress } = useProviderFetchContext();
  const [isLoading, setIsLoading] = useState();

  const handleStripeOnboarding = useCallback(async () => {
    if (isLoading || providerConnectInProgress) return;
    setIsLoading(true);
    try {
      const { data } = await axios.post(STRIPE_ONBOARDING);
      window.open(data.url);
      setIsLoading(false);
      setProviderConnectInProgress(true);
    } catch (e) {
      setIsLoading(false);
      let alertMessage = "Something went wrong! We've been notified";
      if (e.response?.data?.detail) alertMessage = e.response.data.detail;
      alert.error(alertMessage, { timeout: 8000 });
    }
  }, [isLoading, providerConnectInProgress, alert, setProviderConnectInProgress]);

  return (
    <S.StripeConnect onClick={handleStripeOnboarding} isLoading={isLoading} data-testid="stripe-connect-button">
      {isLoading ? <Spinner /> : <span>Connect with</span>}
    </S.StripeConnect>
  );
}

export default StripeConnect;
