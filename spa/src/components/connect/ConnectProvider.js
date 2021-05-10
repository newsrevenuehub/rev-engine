import { useReducer, useEffect, useCallback } from 'react';
import * as S from './ConnectProvider.styled';

// Routing
import { useLocation } from 'react-router-dom';

// Hooks
import useUser from 'hooks/useUser';

// State
import connectReducer, {
  initialState,
  CONNECT_START,
  CONNECT_PROCESSING,
  CONNECT_SUCCESS,
  CONNECT_FAILURE
} from './connect-reducer';

// Deps
import queryString from 'query-string';
import { useAlert } from 'react-alert';

// State
import { useOrganizationContext } from 'components/dashboard/Dashboard';
import getUpdatedUser from 'utilities/getUpdatedUser';
import getConfirmedPaymentProvider from 'utilities/getConfirmedPaymentProvider';

// AJAX
import axios from 'ajax/axios';
import { STRIPE_ONBOARDING, STRIPE_CONFIRMATION } from 'ajax/endpoints';

// Children
import ConnectProcessing from 'components/connect/ConnectProcessing';

function ConnectProvider() {
  const { setConfirmedPaymentProvider } = useOrganizationContext();
  const { search } = useLocation();
  const alert = useAlert();
  const user = useUser();

  const [state, dispatch] = useReducer(connectReducer, initialState);

  const handleStripeOnboarding = useCallback(async () => {
    if (state.loading || state.away) return;
    dispatch({ type: CONNECT_START });
    try {
      const requestBody = {
        organization_pk: user.organization.id
      };
      const { data } = await axios.post(STRIPE_ONBOARDING, requestBody);
      if (data) {
        dispatch({ type: CONNECT_PROCESSING });
        window.open(data.url);
      }
    } catch (e) {
      let alertMessage = "Something went wrong! We've been notified";
      if (e.response?.data?.detail) alertMessage = e.response.data.detail;
      alert.error(alertMessage, { timeout: 8000 });
      dispatch({ type: CONNECT_FAILURE, errors: [alertMessage], status: 'failed' });
    }
  }, [user.organization.id, alert, state.away, state.loading]);

  useEffect(() => {
    // "A user that is redirected to your return_url might not have completed the onboarding process. Use the /v1/accounts endpoint to retrieve the user’s account and check for charges_enabled. If the account is not fully onboarded, provide UI prompts to allow the user to continue onboarding later. The user can complete their account activation through a new account link (generated by your integration). You can check the state of the details_submitted parameter on their account to see if they’ve completed the onboarding process."
    const qs = queryString.parse(search);
    if (qs.cb && qs.cb === 'stripe_reauth') {
      console.log('stripe redirected, reauth necessary');
      /*
        According to stripe docs:
          Your reauth url should trigger a method on your server to call 
          Account Links again with the same parameters, and redirect the 
          user to the Connect Onboarding flow to create a seamless experience.
      */
      handleStripeOnboarding();
    }
    if (qs.cb && qs.cb === 'stripe_return') {
      async function handleStripeConfirmation() {
        const { data } = await axios.post(STRIPE_CONFIRMATION, { org_id: user.organization.id });
        if (data.status === 200) {
          dispatch({ type: CONNECT_SUCCESS, status: 'success' });
          const user = getUpdatedUser();
          setConfirmedPaymentProvider(getConfirmedPaymentProvider(user));
        } else if (data.status === 202) {
          dispatch({ type: CONNECT_SUCCESS, status: 'stripe_restricted' });
        }
      }
      handleStripeConfirmation();
    }
  }, [search, user.organization.id, handleStripeOnboarding, setConfirmedPaymentProvider]);

  return (
    <S.ConnectProvider>
      <h2>To continue, please connect a payment provider</h2>
      <S.ProvidersList>
        <S.ProviderLink>
          <S.ConnectWithStripeButton onClick={handleStripeOnboarding} isLoading={state.loading}>
            <span>Connect with</span>
          </S.ConnectWithStripeButton>
        </S.ProviderLink>
      </S.ProvidersList>
      {state.away && <ConnectProcessing />}
    </S.ConnectProvider>
  );
}

export default ConnectProvider;
