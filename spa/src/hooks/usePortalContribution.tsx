import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useCallback } from 'react';
import axios from 'ajax/axios';
import { getContributionDetailEndpoint } from 'ajax/endpoints';
import SystemNotification from 'components/common/SystemNotification';
import { PortalContribution } from './usePortalContributionList';

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
  /**
   * ID of the Stripe account that owns this payment or subscription.
   */
  stripe_account_id: string;
}

/**
 * Only these fields can be updated on a contribution. They do not overlap with
 * fields returned from a GET on the endpoint.
 */
export interface PortalContributionUpdate {
  provider_payment_method_id: string;
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
    ['portalContribution', contributorId, contributionId],
    () => fetchContribution(contributorId, contributionId)
  );
  const updateContributionMutation = useMutation(
    (data: PortalContributionUpdate) => {
      return axios.patch(getContributionDetailEndpoint(contributorId, contributionId), data);
    },
    {
      onError: () => {
        enqueueSnackbar('A problem occurred while updating your contribution. Please try again.', {
          persist: true,
          content: (key: string, message: string) => (
            <SystemNotification id={key} message={message} header="Failed to Update Contribution" type="error" />
          )
        });
      },
      onSuccess: () => {
        // Don't show a snackbar because the consumer will show a customized message
        // depending on what changed.
        queryClient.invalidateQueries(['portalContribution', contributorId, contributionId]);
      }
    }
  );
  const updateContribution = useCallback(
    (data: PortalContributionUpdate) => updateContributionMutation.mutateAsync(data),
    [updateContributionMutation]
  );

  return { contribution: data, isError, isFetching, isLoading, refetch, updateContribution };
}
