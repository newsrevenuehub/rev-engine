import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import axios from 'ajax/axios';
import { RevenueProgram } from './useContributionPage';
import { getRevenueProgramActiveCampaignStatusEndpoint } from 'ajax/endpoints';
import useUser from './useUser';

export interface RevenueProgramActiveCampaignStatus {
  /** Whether the revenue program is connected to ActiveCampaign. */
  activecampaign_integration_connected: boolean;
  /** ActiveCampaign server URL, as set by the user when initially configuring the integration. */
  activecampaign_server_url: string | null;
  /** ID of the revenue program. */
  id: string;
  /** Name of the revenue program. */
  name: string;
  /** Slug of the revenue program. */
  slug: string;
}

export interface SaveRevenueProgramActiveCampaignUrlAndKeyValidationErrors {
  /**
   * Non-field error message.
   */
  non_field_errors?: string[];
}

async function fetchActiveCampaignStatus(
  revenueProgramId: RevenueProgram['id']
): Promise<RevenueProgramActiveCampaignStatus> {
  return (await axios.get(getRevenueProgramActiveCampaignStatusEndpoint(revenueProgramId))).data;
}

async function patchActiveCampaignApiKeyAndServerUrl(
  revenueProgramId: RevenueProgram['id'],
  accessToken: string,
  serverUrl: string
): Promise<RevenueProgramActiveCampaignStatus> {
  return (
    await axios.patch(getRevenueProgramActiveCampaignStatusEndpoint(revenueProgramId), {
      activecampaign_access_token: accessToken,
      activecampaign_server_url: serverUrl
    })
  ).data;
}

export function useConnectActiveCampaign() {
  const { user } = useUser();
  const firstRevenueProgram = useMemo(() => user?.revenue_programs?.[0], [user?.revenue_programs]);
  const enabled = !!(firstRevenueProgram && user?.organizations?.length === 1);
  const queryClient = useQueryClient();
  const { data, isError, isLoading } = useQuery(
    ['revenueProgramActiveCampaignStatus'],
    () => fetchActiveCampaignStatus(firstRevenueProgram!.id),
    { enabled }
  );
  const { mutateAsync: updateAccessTokenAndServerUrl } = useMutation(
    ({ accessToken, serverUrl }: { accessToken: string; serverUrl: string }) =>
      patchActiveCampaignApiKeyAndServerUrl(firstRevenueProgram!.id, accessToken, serverUrl),
    {
      onSuccess() {
        queryClient.invalidateQueries(['revenueProgramActiveCampaignStatus']);
      }
    }
  );

  return {
    activecampaign_integration_connected: data?.activecampaign_integration_connected,
    activecampaign_server_url: data?.activecampaign_server_url,
    updateAccessTokenAndServerUrl: data ? updateAccessTokenAndServerUrl : undefined,
    isError,
    isLoading
  };
}
