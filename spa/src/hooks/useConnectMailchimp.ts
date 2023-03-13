import { UseQueryResult } from '@tanstack/react-query';
import queryString from 'query-string';
import { useCallback } from 'react';

import { NRE_MAILCHIMP_CLIENT_ID } from 'appSettings';
import { MAILCHIMP_OAUTH_SUCCESS_ROUTE } from 'routes';
import { EnginePlan } from './useContributionPage';
import useUser from './useUser';

export type UnverifiedReason = '' | 'pending_verification' | 'past_due';

export interface UseConnectMailchimpAccountResult {
  isLoading: UseQueryResult['isLoading'];
  isError: UseQueryResult['isError'];
  /**
   * Sends the user to Mailchimp to continue setup.
   */
  sendUserToMailchimp?: () => void;
  /**
   * Has Mailchimp been connected?
   */
  connectedToMailchimp: boolean;
  /**
   * User's organization plan
   */
  organizationPlan?: EnginePlan['name']; //'FREE' | 'CORE' | 'PLUS';
}

export default function useConnectMailchimpAccount(): UseConnectMailchimpAccountResult {
  const BASE_URL = window.location.origin;
  const OAUTH_CALLBACK = `${BASE_URL}${MAILCHIMP_OAUTH_SUCCESS_ROUTE}`;
  const { user, isError, isLoading } = useUser();

  const sendUserToMailchimp = useCallback(() => {
    if (!NRE_MAILCHIMP_CLIENT_ID) {
      // Should never happen--only if there is an issue with the env variable.
      throw new Error('There is no Mailchimp client ID associated.');
    }

    window.location.href = `https://login.mailchimp.com/oauth2/authorize?${queryString.stringify({
      response_type: 'code',
      client_id: NRE_MAILCHIMP_CLIENT_ID,
      redirect_uri: OAUTH_CALLBACK
    })}`;
  }, [OAUTH_CALLBACK]);

  // If the user is loading or errored, return that status.
  if (isLoading || isError) {
    return { isError, isLoading, connectedToMailchimp: false };
  }

  // If the user has no revenue programs, no org or multiple orgs return that there's no action to take.
  if (
    user?.organizations?.length === 0 ||
    (user?.organizations?.length ?? 0) > 1 ||
    !user?.revenue_programs ||
    user.revenue_programs.length === 0
  ) {
    return {
      isError: false,
      isLoading: false,
      connectedToMailchimp: false
    };
  }

  // If the organization has mailchimp connected or if org plan is Free, return that status.
  if (user?.organizations?.[0].show_connected_to_mailchimp || user?.organizations?.[0].plan.name === 'FREE') {
    return {
      isError: false,
      isLoading: false,
      connectedToMailchimp:
        user?.organizations?.[0].show_connected_to_mailchimp ||
        user?.revenue_programs?.[0]?.mailchimp_integration_connected,
      organizationPlan: user?.organizations?.[0].plan.name
    };
  }

  // We have a user, with a single organization in a paid plan (CORE or PLUS), and without Mailchimp connected.
  return {
    isError,
    isLoading,
    sendUserToMailchimp,
    connectedToMailchimp:
      user?.organizations?.[0].show_connected_to_mailchimp ||
      user?.revenue_programs?.[0]?.mailchimp_integration_connected,
    organizationPlan: user?.organizations?.[0].plan.name
  };
}
