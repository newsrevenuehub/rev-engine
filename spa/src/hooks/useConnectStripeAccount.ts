import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { useAlert } from 'react-alert';

import axios from 'ajax/axios';
import { getStripeAccountLinkStatusPath } from 'ajax/endpoints';
import { GENERIC_ERROR } from 'constants/textConstants';
import { useHistory } from 'react-router-dom';
import { SIGN_IN } from 'routes';
import useUser from './useUser';

export type UnverifiedReason = '' | 'pending_verification' | 'past_due';

export interface UseConnectStripeAccountResult {
  isLoading: UseQueryResult['isLoading'];
  isError: UseQueryResult['isError'];
  /**
   * Does the Stripe account need to be verified?
   */
  requiresVerification?: boolean;
  /**
   * Sends the user to Stripe to continue setup.
   */
  sendUserToStripe?: () => void;
  /**
   * Has the Stripe connection process begun?
   */
  stripeConnectStarted?: boolean;
  /**
   * If the Stripe account isn't verified, why?
   */
  unverifiedReason?: UnverifiedReason;
  /**
   * Used to signal that connection success has occurred and alert user
   */
  displayConnectionSuccess: boolean;
  /**
   * Used to flip `displayConnectionSuccess` to false, in particular
   * after a user acknowledges.
   */
  hideConnectionSuccess: () => void;
}

/**
 * API response we get when asking for the Stripe link status for a revenue
 * program.
 */
export interface StripeAccountLinkStatusResponse {
  reason?: UnverifiedReason;
  requiresVerification: boolean;
  stripeConnectStarted: boolean;
  url: string;
}

async function fetchAccountLinkStatus(rpId: number) {
  // this endpoint can have a number of small side effects, including creating a stripe account link
  // and causing a stripe account ID to be added to the RP's payment provider. Because of this, it uses
  // POST as opposed to GET
  const { data } = await axios.post(getStripeAccountLinkStatusPath(rpId), {});

  return data;
}

export default function useConnectStripeAccount(): UseConnectStripeAccountResult {
  const alert = useAlert();
  const { refetch: refetchUser, user, isError: userIsError, isLoading: userIsLoading } = useUser();
  const history = useHistory();
  const [displayConnectionSuccess, setDisplayConnectionSuccess] = useState(false);
  const hideConnectionSuccess = () => setDisplayConnectionSuccess(false);

  const rpIdToFetch = useMemo(() => {
    // If the user is not an org admin or the RP has been verified, we don't need to go any further
    // Users can only have one revenue program right now.

    if (user?.role_type?.[0] !== 'org_admin' || user?.revenue_programs[0]?.payment_provider_stripe_verified) {
      return undefined;
    }

    return user?.revenue_programs[0]?.id;
  }, [user?.revenue_programs, user?.role_type]);
  const { data, isError, isLoading } = useQuery(
    ['stripeAccountLinkStatus'],
    () => {
      if (!rpIdToFetch) {
        // This should normally never happen--would only trigger if there's a flaw
        // in this hook's logic.
        throw new Error('Asked to retrieve Stripe account status before user was available');
      }

      return fetchAccountLinkStatus(rpIdToFetch);
    },
    {
      enabled: !!rpIdToFetch,
      refetchInterval: 30000, // in ms, so 30 seconds. note this won't happen if app browser tab is inactive
      retry: false,
      onSuccess(data: StripeAccountLinkStatusResponse) {
        if (!data.requiresVerification) {
          // This will cause the user to be refetched, the user's revenue
          // program should now appear as having Stripe verified, which will in
          // turn hide the Stripe Account Link CTAs.
          refetchUser();
          setDisplayConnectionSuccess(true);
        }
      },
      onError: (err: Error) => {
        if (err?.name === 'AuthenticationError') {
          history.push(SIGN_IN);
        } else {
          console.error(err);
          alert.error(GENERIC_ERROR);
        }
      }
    }
  );

  const sendUserToStripe = useCallback(() => {
    if (!data?.url) {
      // Should never happen--only if there is a flaw in this hook logic.
      throw new Error('There is no URL to send the user to');
    }

    window.location.assign(data?.url);
  }, [data?.url]);

  // If the user is loading or errored, return that status.

  if (userIsLoading || userIsError) {
    return { isError: userIsError, isLoading: userIsLoading, displayConnectionSuccess, hideConnectionSuccess };
  }

  // If the user has no revenue programs, return that there's no action to take.

  if (!user?.revenue_programs || user.revenue_programs.length === 0) {
    return {
      isError: false,
      isLoading: false,
      requiresVerification: false,
      stripeConnectStarted: false,
      displayConnectionSuccess,
      hideConnectionSuccess
    };
  }

  // If the revenue program is verified, return that status.

  if (user?.revenue_programs[0].payment_provider_stripe_verified) {
    return {
      isError: false,
      isLoading: false,
      requiresVerification: false,
      stripeConnectStarted: false,
      displayConnectionSuccess,
      hideConnectionSuccess
    };
  }

  // We have a user and are either fetching their Stripe status or have it.

  return {
    isError,
    isLoading,
    sendUserToStripe: data?.url ? sendUserToStripe : undefined,
    requiresVerification: data?.requiresVerification,
    stripeConnectStarted: data?.stripeConnectStarted,
    unverifiedReason: data?.reason,
    displayConnectionSuccess,
    hideConnectionSuccess
  };
}
