import { useQuery } from '@tanstack/react-query';
import { getContributorImpactEndpoint } from 'ajax/endpoints';
import axios from 'ajax/portal-axios';

export interface PortalImpact {
  /**
   * Total amount contributed in cents (= total_payments - total_refunded).
   */
  total: number;
  /**
   * Total net amount contributed in cents.
   */
  total_payments: number;
  /**
   * Total amount refunded in cents
   */
  total_refunded: number;
}

async function fetchImpact(contributorId: number) {
  const { data } = await axios.get<PortalImpact>(getContributorImpactEndpoint(contributorId));
  return data;
}

/**
 * Manages fetching the impact of a contributor
 */
export function usePortalContributorImpact(contributorId?: number) {
  const { data, isLoading, isError } = useQuery(['portalImpact'], () => fetchImpact(contributorId!), {
    enabled: !!contributorId,
    keepPreviousData: true
  });

  return { impact: data, isLoading, isError };
}
