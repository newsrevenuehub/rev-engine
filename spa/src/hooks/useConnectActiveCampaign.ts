import { useQuery } from '@tanstack/react-query';
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

function fetchActiveCampaignStatus(
  revenueProgramId: RevenueProgram['id']
): Promise<RevenueProgramActiveCampaignStatus> {
  return axios.get(getRevenueProgramActiveCampaignStatusEndpoint(revenueProgramId)).then(({ data }) => data);
}

export function useConnectActiveCampaign() {
  const { user } = useUser();
  const firstRevenueProgram = useMemo(() => user?.revenue_programs?.[0], [user?.revenue_programs]);
  const enabled = !!(firstRevenueProgram && user?.organizations?.length === 1);
  const { data, isError, isLoading } = useQuery(
    ['revenueProgramActiveCampaignStatus'],
    () => fetchActiveCampaignStatus(firstRevenueProgram!.id),
    { enabled }
  );

  return { data, isError, isLoading };
}
