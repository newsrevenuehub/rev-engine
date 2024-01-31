import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'ajax/axios';
import { getContributionDetailEndpoint } from 'ajax/endpoints';
import { useSnackbar } from 'notistack';
import { useCallback } from 'react';
import { PortalContribution } from './usePortalContributionList';
import { AxiosError } from 'axios';
import SystemNotification from 'components/common/SystemNotification';

export interface PortalContributionPayment {
  /**
   * Amount refunded in cents. This is to allow for partial refunds.
   */
  amount_refunded: number;
  /**
   * Timestamp when the payment occurred.
   */
  created: string;
  /**
   * Total amount paid in cents.
   */
  gross_amount_paid: number;
  /**
   * Amount paid in cents minus fees.
   */
  net_amount_paid: number;
  /**
   * Type of payment.
   */
  status: 'paid' | 'refunded';
}

export interface PortalContributionDetail extends PortalContribution {
  /**
   * Name on the credit card used in the contribution.
   */
  card_owner_name: string;
  /**
   * Were fees paid by the contributor?
   */
  paid_fees: boolean;
  /**
   * Payment history for the contribution
   */
  payments: PortalContributionPayment[];
}

async function fetchContribution(contributorId: number, contributionId: number) {
  const { data } = await axios.get<PortalContributionDetail>(
    getContributionDetailEndpoint(contributorId, contributionId)
  );

  return data;
}

/**
 * Manages a single contribution the user has made.
 */
export function usePortalContribution(contributorId: number, contributionId: number) {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const { data, isError, isFetching, isLoading, refetch } = useQuery(
    [`portalContribution-${contributorId}-${contributionId}`],
    () => fetchContribution(contributorId, contributionId),
    { keepPreviousData: true }
  );

  const cancelContributionMutation = useMutation(
    (contributionId: number) => {
      return axios.delete<PortalContributionDetail>(getContributionDetailEndpoint(contributorId, contributionId));
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries([`portalContribution-${contributorId}-${contributionId}`]);
        queryClient.invalidateQueries(['portalContributionList']);

        enqueueSnackbar('Your contribution has been successfully cancelled.', {
          persist: true,
          content: (key: string, message: string) => (
            <SystemNotification id={key} message={message} header="Contribution canceled" type="success" />
          )
        });
      },
      onError: (error: AxiosError) => {
        enqueueSnackbar(error?.response?.data?.detail || 'Something went wrong. Please, try again later.', {
          persist: true,
          content: (key: string, message: string) => (
            <SystemNotification id={key} message={message} header="Error canceling contribution" type="error" />
          )
        });
      }
    }
  );

  const cancelContribution = useCallback(
    async (contributionId: number) => {
      const response = await cancelContributionMutation.mutateAsync(contributionId);

      return response;
    },
    [cancelContributionMutation]
  );

  return {
    contribution: data,
    isError,
    isFetching,
    isLoading,
    refetch,
    cancelContribution
  };
}
