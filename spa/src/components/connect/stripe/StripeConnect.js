import { useState, useEffect } from 'react';
import * as S from './StripeConnect.styled';

// Deps
import { useAlert } from 'react-alert';

// Constants
import { STRIPE_CLIENT_ID, STRIPE_OAUTH_SCOPE } from 'settings';

// Hooks
import useQueryString from 'hooks/useQueryString';

// AJAX
import useRequest from 'hooks/useRequest';
import { STRIPE_OAUTH } from 'ajax/endpoints';

// Elements
import { GENERIC_ERROR } from 'constants/textConstants';
import GlobalLoading from 'elements/GlobalLoading';

function StripeConnect({ getStripeVerification }) {
  const alert = useAlert();
  const [loading, setLoading] = useState(false);
  const stripeOAuthScope = useQueryString('scope');
  const stripeOAuthCode = useQueryString('code');

  const requestStripeOAuth = useRequest();
  // STRIPE_OAUTH_REDIRECT_URI =
  const STRIPE_OAUTH_REDIRECT_URI = `${window.location.host}/dashboard/content`;
  const getStripeOAuthLink = () => {
    return `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${STRIPE_CLIENT_ID}&scope=${STRIPE_OAUTH_SCOPE}&redirect_uri=${STRIPE_OAUTH_REDIRECT_URI}`;
  };

  useEffect(() => {
    if (stripeOAuthScope && stripeOAuthCode) {
      setLoading(true);
      requestStripeOAuth(
        {
          method: 'POST',
          url: STRIPE_OAUTH,
          data: { scope: stripeOAuthScope, code: stripeOAuthCode }
        },
        {
          onSuccess: (res) => {
            setLoading(false);
            getStripeVerification();
          },
          onFailure: (e) => {
            setLoading(false);
            alert.error(GENERIC_ERROR);
          }
        }
      );
    }
  }, [stripeOAuthScope, stripeOAuthCode, alert]);

  return (
    <>
      <S.StripeConnect href={getStripeOAuthLink()} data-testid="stripe-connect-link">
        <span>Connect with</span>
      </S.StripeConnect>
      {loading && <GlobalLoading />}
    </>
  );
}

export default StripeConnect;
