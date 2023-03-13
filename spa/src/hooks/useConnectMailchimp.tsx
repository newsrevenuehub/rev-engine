import { UseQueryResult } from '@tanstack/react-query';
import queryString from 'query-string';
import { useCallback, useEffect } from 'react';

import { NRE_MAILCHIMP_CLIENT_ID } from 'appSettings';
import { MAILCHIMP_OAUTH_SUCCESS_ROUTE } from 'routes';
import { EnginePlan } from './useContributionPage';
import useUser from './useUser';
import useFeatureFlags from './useFeatureFlags';
import flagIsActiveForUser from 'utilities/flagIsActiveForUser';
import { MAILCHIMP_INTEGRATION_ACCESS_FLAG_NAME } from 'constants/featureFlagConstants';
import { useSnackbar } from 'notistack';
import SystemNotification from 'components/common/SystemNotification';

import usePreviousState from './usePreviousState';

export type UnverifiedReason = '' | 'pending_verification' | 'past_due';

export interface UseConnectMailchimpResult {
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

export default function useConnectMailchimp(): UseConnectMailchimpResult {
  const BASE_URL = window.location.origin;
  const OAUTH_CALLBACK = `${BASE_URL}${MAILCHIMP_OAUTH_SUCCESS_ROUTE}`;
  const { enqueueSnackbar } = useSnackbar();
  const { user, isError, isLoading } = useUser();
  const { flags } = useFeatureFlags();
  const hasMailchimpAccess = flagIsActiveForUser(MAILCHIMP_INTEGRATION_ACCESS_FLAG_NAME, flags);
  const prevMailchimpConnection = usePreviousState(user?.revenue_programs?.[0]?.mailchimp_integration_connected);

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

  useEffect(() => {
    if (user?.revenue_programs?.[0]?.mailchimp_integration_connected && prevMailchimpConnection === false) {
      enqueueSnackbar('You’ve successfully connected to Mailchimp! Your contributor data will sync automatically.', {
        persist: true,
        content: (key: string, message: string) => (
          <SystemNotification id={key} message={message} header="Successfully Connected!" type="success" />
        )
      });
    }
  }, [enqueueSnackbar, prevMailchimpConnection, user?.revenue_programs]);

  // If the user is loading or errored, return that status.
  if (isLoading || isError) {
    return { isError, isLoading, connectedToMailchimp: false };
  }

  // If the user has no feature flag enabling mailchimp integration, has no revenue programs, no org or multiple orgs return that there's no action to take.
  if (
    !hasMailchimpAccess ||
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
  if (
    user?.organizations?.[0].show_connected_to_mailchimp ||
    user?.revenue_programs?.[0]?.mailchimp_integration_connected ||
    !['CORE', 'PLUS'].includes(user?.organizations?.[0]?.plan?.name)
  ) {
    console.log({
      org: user?.organizations?.[0].show_connected_to_mailchimp,
      rp: user?.revenue_programs?.[0]?.mailchimp_integration_connected
    });
    return {
      isError: false,
      isLoading: false,
      connectedToMailchimp:
        !!user?.organizations?.[0].show_connected_to_mailchimp ||
        !!user?.revenue_programs?.[0]?.mailchimp_integration_connected,
      organizationPlan: user?.organizations?.[0]?.plan?.name
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
