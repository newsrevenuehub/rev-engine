import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'ajax/axios';
import { getContributionDetailEndpoint } from 'ajax/endpoints';
import { useSnackbar } from 'notistack';
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

  const { mutateAsync: cancelContribution } = useMutation(
    async () => {
      return await axios.delete<PortalContributionDetail>(getContributionDetailEndpoint(contributorId, contributionId));
    },
    {
      onSuccess: () => {
        // Invalidate contribution details for `is_cancelable` to be updated.
        queryClient.invalidateQueries([`portalContribution-${contributorId}-${contributionId}`]);

        setTimeout(() => {
          // Refresh the contribution details and list after 15 seconds to allow the backend / stripe to process the cancellation.
          queryClient.invalidateQueries(['portalContributionList']);
          queryClient.invalidateQueries([`portalContribution-${contributorId}-${contributionId}`]);
        }, 15000);

        enqueueSnackbar('Your contribution has been successfully canceled.', {
          persist: true,
          content: (key: string, message: string) => (
            <SystemNotification id={key} message={message} header="Contribution canceled" type="success" />
          )
        });
      },
      onError: (error: AxiosError) => {
        console.error('[usePortalContribution:cancelContribution] ', error);
        enqueueSnackbar(error?.response?.data?.detail ?? 'Something went wrong. Please, try again later.', {
          persist: true,
          content: (key: string, message: string) => (
            <SystemNotification id={key} message={message} header="Error canceling contribution" type="error" />
          )
        });
      }
    }
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
