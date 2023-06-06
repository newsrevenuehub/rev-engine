import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import queryString from 'query-string';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { NRE_MAILCHIMP_CLIENT_ID } from 'appSettings';
import axios from 'ajax/axios';
import SystemNotification from 'components/common/SystemNotification';
import { MAILCHIMP_INTEGRATION_ACCESS_FLAG_NAME } from 'constants/featureFlagConstants';
import { MAILCHIMP_OAUTH_SUCCESS_ROUTE } from 'routes';
import flagIsActiveForUser from 'utilities/flagIsActiveForUser';
import useFeatureFlags from './useFeatureFlags';
import useUser from './useUser';
import usePreviousState from './usePreviousState';
import {
  MailchimpAudience,
  RevenueProgramMailchimpStatus,
  UseConnectMailchimpResult
} from './useConnectMailchimp.types';
import { RevenueProgram } from './useContributionPage';
import { getRevenueProgramMailchimpStatusEndpoint } from 'ajax/endpoints';

const BASE_URL = window.location.origin;
export const MAILCHIMP_OAUTH_CALLBACK = `${BASE_URL}${MAILCHIMP_OAUTH_SUCCESS_ROUTE}`;

function fetchMailchimpStatus(revenueProgramId: RevenueProgram['id']): Promise<RevenueProgramMailchimpStatus> {
  return axios.get(getRevenueProgramMailchimpStatusEndpoint(revenueProgramId)).then(({ data }) => data);
}

export default function useConnectMailchimp(): UseConnectMailchimpResult {
  // Allow our refetch interval to be configurable, but default to false, which
  // means it won't refetch on its own.
  const [refetchInterval, setRefetchInterval] = useState<false | number>(false);
  const { enqueueSnackbar } = useSnackbar();
  const { user, isError: userIsError, isLoading: userIsLoading } = useUser();
  const firstRevenueProgram = useMemo(() => user?.revenue_programs?.[0], [user?.revenue_programs]);
  const queryClient = useQueryClient();
  const mailchimpQueryEnabled = !!(firstRevenueProgram && user?.organizations.length === 1);
  const {
    data: mailchimpData,
    isError: mailchimpIsError,
    isLoading: mailchimpIsLoading
  } = useQuery(['revenueProgramMailchimpStatus'], () => fetchMailchimpStatus(firstRevenueProgram!.id), {
    refetchInterval,
    enabled: mailchimpQueryEnabled
  });
  const patchMutation = useMutation(
    (data: Partial<RevenueProgramMailchimpStatus>) => {
      if (!firstRevenueProgram) {
        // Should never happen.
        throw new Error('User has no revenue program');
      }

      return axios.patch(getRevenueProgramMailchimpStatusEndpoint(firstRevenueProgram.id), data);
    },
    {
      onSuccess: () => queryClient.invalidateQueries(['revenueProgramMailchimpStatus'])
    }
  );
  const selectAudience = useCallback(
    async (id: MailchimpAudience['id']) => {
      await patchMutation.mutateAsync({ mailchimp_list_id: id });
    },
    [patchMutation]
  );
  const { flags } = useFeatureFlags();
  const hasMailchimpAccess = flagIsActiveForUser(MAILCHIMP_INTEGRATION_ACCESS_FLAG_NAME, flags);
  const prevMailchimpConnection = usePreviousState(mailchimpData?.mailchimp_integration_connected);
  const sendUserToMailchimp = useCallback(() => {
    if (!NRE_MAILCHIMP_CLIENT_ID) {
      // Should never happen--only if there is an issue with the env variable.
      throw new Error('There is no Mailchimp client ID associated.');
    }

    window.location.assign(
      `https://login.mailchimp.com/oauth2/authorize?${queryString.stringify({
        response_type: 'code',
        client_id: NRE_MAILCHIMP_CLIENT_ID,
        redirect_uri: MAILCHIMP_OAUTH_CALLBACK
      })}`
    );
  }, []);

  // Only require audience selection if there is no list selected, and if the
  // audience lists is populated (mailchimp connection successfully started).

  const requiresAudienceSelection =
    !mailchimpData?.mailchimp_list_id && (mailchimpData?.available_mailchimp_email_lists?.length ?? 0) > 0;

  useEffect(() => {
    // Reset the retrieval interval; we might have increased it in
    // MailchimpOAuthSuccess. We might not have if the user ended their session
    // after starting the Mailchimp connection process, but in that case, this
    // will do nothing.

    if (requiresAudienceSelection) {
      setRefetchInterval(false);
    }
  }, [requiresAudienceSelection, setRefetchInterval]);

  useEffect(() => {
    if (mailchimpData?.mailchimp_integration_connected && prevMailchimpConnection === false) {
      enqueueSnackbar('You’ve successfully connected to Mailchimp! Your contributor data will sync automatically.', {
        persist: true,
        content: (key: string, message: string) => (
          <SystemNotification id={key} message={message} header="Successfully Connected!" type="success" />
        )
      });
    }
  }, [enqueueSnackbar, mailchimpData?.mailchimp_integration_connected, prevMailchimpConnection]);

  const result: UseConnectMailchimpResult = {
    hasMailchimpAccess,
    requiresAudienceSelection,
    setRefetchInterval,
    connectedToMailchimp: !!(
      user?.organizations?.[0]?.show_connected_to_mailchimp || mailchimpData?.mailchimp_integration_connected
    ),
    isError: userIsError || mailchimpIsError,
    isLoading: userIsLoading || (mailchimpQueryEnabled && mailchimpIsLoading),
    organizationPlan: user?.organizations?.[0]?.plan?.name,
    revenueProgram: firstRevenueProgram
  };

  // If we are in an error state, then override loading status. e.g. If the user
  // query has errored out, the Mailchimp query status is still 'loading', but
  // we want to hide that from the consumer.

  if (result.isError) {
    result.isLoading = false;
  }

  // If we have access to Mailchimp through the feature flag, are on a paid
  // plan, and Mailchimp status has loaded, allow the user to connect to it.

  if (result.hasMailchimpAccess && result.organizationPlan !== 'FREE' && mailchimpData) {
    result.sendUserToMailchimp = sendUserToMailchimp;
  }

  // If we are connected to Mailchimp, add related properties.

  if (result.connectedToMailchimp) {
    result.audiences = mailchimpData?.available_mailchimp_email_lists;
    result.selectAudience = selectAudience;
    result.selectedAudience = mailchimpData?.chosen_mailchimp_email_list;
  }

  return result;
}
