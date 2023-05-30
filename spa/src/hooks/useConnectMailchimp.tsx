import { UseQueryResult } from '@tanstack/react-query';
import queryString from 'query-string';
import { useCallback, useEffect } from 'react';

import { NRE_MAILCHIMP_CLIENT_ID } from 'appSettings';
import SystemNotification from 'components/common/SystemNotification';
import { MAILCHIMP_INTEGRATION_ACCESS_FLAG_NAME } from 'constants/featureFlagConstants';
import { useSnackbar } from 'notistack';
import { MAILCHIMP_OAUTH_SUCCESS_ROUTE } from 'routes';
import flagIsActiveForUser from 'utilities/flagIsActiveForUser';
import { EnginePlan, RevenueProgram } from './useContributionPage';
import useFeatureFlags from './useFeatureFlags';
import useUser from './useUser';

import usePreviousState from './usePreviousState';

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
   * Mailchimp connection started but hasn't finished and still need audience selection?
   */
  requiresAudienceSelection: boolean;
  /**
   * Current Revenue Program being connected to Mailchimp
   */
  revenueProgram?: RevenueProgram;
  /**
   * User's organization plan
   */
  organizationPlan?: EnginePlan['name'];
  /**
   * User has Mailchimp feature flag enabled
   */
  hasMailchimpAccess: boolean;
}

const BASE_URL = window.location.origin;
export const MAILCHIMP_OAUTH_CALLBACK = `${BASE_URL}${MAILCHIMP_OAUTH_SUCCESS_ROUTE}`;

export default function useConnectMailchimp(): UseConnectMailchimpResult {
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
      redirect_uri: MAILCHIMP_OAUTH_CALLBACK
    })}`;
  }, []);

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
    return { isError, isLoading, connectedToMailchimp: false, requiresAudienceSelection: false, hasMailchimpAccess };
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
      connectedToMailchimp: false,
      requiresAudienceSelection: false,
      organizationPlan: user?.organizations?.[0]?.plan?.name,
      hasMailchimpAccess
    };
  }

  // If the organization has mailchimp connected or if org plan is Free, return that status.
  if (
    user?.organizations?.[0]?.show_connected_to_mailchimp ||
    user?.revenue_programs?.[0]?.mailchimp_integration_connected ||
    (user?.organizations?.[0]?.plan?.name ?? 'FREE') === 'FREE'
  ) {
    return {
      hasMailchimpAccess,
      isError: false,
      isLoading: false,
      connectedToMailchimp:
        !!user?.organizations?.[0]?.show_connected_to_mailchimp ||
        !!user?.revenue_programs?.[0]?.mailchimp_integration_connected,
      organizationPlan: user?.organizations?.[0]?.plan?.name,
      // Even with Mailchimp connected, we still may need to select an audience list.
      requiresAudienceSelection:
        !user?.revenue_programs?.[0]?.mailchimp_email_list?.id &&
        (user?.revenue_programs?.[0]?.mailchimp_email_lists?.length ?? 0) > 0,
      revenueProgram: user?.revenue_programs?.[0]
    };
  }

  // We have a user, with a single organization in a paid plan (CORE or PLUS), and without Mailchimp connected.
  return {
    isError,
    isLoading,
    sendUserToMailchimp,
    connectedToMailchimp:
      !!user?.organizations?.[0]?.show_connected_to_mailchimp ||
      !!user?.revenue_programs?.[0]?.mailchimp_integration_connected,
    organizationPlan: user?.organizations?.[0].plan.name,
    // Only require audience selection if there is no list selected, and if the
    // audience lists is populated (mailchimp connection successfully started)
    requiresAudienceSelection:
      !user?.revenue_programs?.[0]?.mailchimp_email_list?.id &&
      (user?.revenue_programs?.[0]?.mailchimp_email_lists?.length ?? 0) > 0,
    revenueProgram: user?.revenue_programs?.[0],
    hasMailchimpAccess
  };
}
