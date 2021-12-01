import { useState, useEffect } from 'react';
import * as S from './StripeConnect.styled';

// Deps
import { useAlert } from 'react-alert';

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

  const getStripeOAuthLink = () => {
    return 'https://connect.stripe.com/oauth/authorize?response_type=code&client_id=ca_JGxDCnO08VRFiIKWUuBfOmOx70wFiBW0&scope=read_write&redirect_uri=http://support.revengine-local.com:3000/dashboard/content';
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
      <S.StripeConnect href={getStripeOAuthLink()} data-testid="stripe-connect-button">
        <span>Connect with</span>
      </S.StripeConnect>
      {loading && <GlobalLoading />}
    </>
  );
}

export default StripeConnect;
