import { useState, useCallback } from 'react';
import * as S from './StripeConnect.styled';

// Deps
import { useAlert } from 'react-alert';

// AJAX
import useRequest from 'hooks/useRequest';
import { STRIPE_ONBOARDING } from 'ajax/endpoints';

// State
import { useProviderFetchContext } from 'components/connect/ProviderConnect';

// Elements
import Spinner from 'elements/Spinner';

function StripeConnect() {
  const alert = useAlert();
  const { providerConnectInProgress, setProviderConnectInProgress } = useProviderFetchContext();
  const [isLoading, setIsLoading] = useState();

  const requestStripeOnboarding = useRequest();

  const handleStripeOnboarding = useCallback(async () => {
    if (isLoading || providerConnectInProgress) return;
    setIsLoading(true);
    requestStripeOnboarding(
      {
        method: 'POST',
        url: STRIPE_ONBOARDING
      },
      {
        onSuccess: ({ data }) => {
          window.open(data.url);
          setIsLoading(false);
          setProviderConnectInProgress(true);
        },
        onFailure: (e) => {
          setIsLoading(false);
          let alertMessage = "Something went wrong! We've been notified";
          if (e.response?.data?.detail) alertMessage = e.response.data.detail;
          alert.error(alertMessage, { timeout: 8000 });
        }
      }
    );
  }, [isLoading, providerConnectInProgress, alert, setProviderConnectInProgress]);

  return (
    <S.StripeConnect onClick={handleStripeOnboarding} isLoading={isLoading} data-testid="stripe-connect-button">
      {isLoading ? <Spinner /> : <span>Connect with</span>}
    </S.StripeConnect>
  );
}

export default StripeConnect;
