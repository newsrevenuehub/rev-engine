import { useEffect } from 'react';
import * as S from './StripeConnect.styled';

// Deps
import { useAlert } from 'react-alert';

// Hooks
import useQueryString from 'hooks/useQueryString';

// AJAX
import useRequest from 'hooks/useRequest';
import { STRIPE_OAUTH } from 'ajax/endpoints';

// State
import { useProviderFetchContext } from 'components/connect/ProviderConnect';

// Elements
import Spinner from 'elements/Spinner';
import { GENERIC_ERROR } from 'constants/textConstants';

function StripeConnect() {
  const alert = useAlert();
  const stripeOAuthScope = useQueryString('scope');
  const stripeOAuthCode = useQueryString('code');

  const requestStripeOAuth = useRequest();

  const getStripeOAuthLink = () => {
    return 'https://connect.stripe.com/oauth/authorize?response_type=code&client_id=ca_JGxDCnO08VRFiIKWUuBfOmOx70wFiBW0&scope=read_write&redirect_uri=http://support.revengine-local.com:3000/dashboard/content';
  };

  useEffect(() => {
    if (stripeOAuthScope && stripeOAuthCode) {
      requestStripeOAuth(
        {
          method: 'POST',
          url: STRIPE_OAUTH,
          data: { scope: stripeOAuthScope, code: stripeOAuthCode }
        },
        {
          onSuccess: ({ data }) => {},
          onFailure: (e) => alert.error(GENERIC_ERROR)
        }
      );
    }
  }, [stripeOAuthScope, stripeOAuthCode]);

  // const handleStripeOnboarding = useCallback(async () => {
  //   if (isLoading || providerConnectInProgress) return;
  //   setIsLoading(true);
  //   requestStripeOnboarding(
  //     {
  //       method: 'POST',
  //       url: STRIPE_ONBOARDING
  //     },
  //     {
  //       onSuccess: ({ data }) => {
  //         window.open(data.url);
  //         setIsLoading(false);
  //         setProviderConnectInProgress(true);
  //       },
  //       onFailure: (e) => {
  //         setIsLoading(false);
  //         let alertMessage = "Something went wrong! We've been notified";
  //         if (e.response?.data?.detail) alertMessage = e.response.data.detail;
  //         alert.error(alertMessage, { timeout: 8000 });
  //       }
  //     }
  //   );
  // }, [isLoading, providerConnectInProgress, alert, setProviderConnectInProgress]);

  return (
    <S.StripeConnect href={getStripeOAuthLink()} data-testid="stripe-connect-button">
      <span>Connect with</span>
    </S.StripeConnect>
  );
}

export default StripeConnect;
