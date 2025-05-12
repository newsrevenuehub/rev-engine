import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getContributionDetailEndpoint, getContributionSendEmailReceiptEndpoint } from 'ajax/endpoints';
import axios from 'ajax/portal-axios';
import { AxiosError } from 'axios';
import SystemNotification from 'components/common/SystemNotification';
import { useSnackbar } from 'notistack';
import { useCallback } from 'react';
import { PortalContribution } from './usePortalContributionList';

export interface PortalContributionPayment {
  /**
   * Amount refunded in cents. This is to allow for partial refunds.
   */
  amount_refunded: number;
  /**
   * Timestamp when the payment was created. This may *not* be the same as when
   * the payment actually occurred.
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
  /**
   * Timestamp of when the transaction occurred. If omitted, this data isn't
   * available and we should fall back to `created`.
   */
  transaction_time?: string;
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
  /**
   * Canceled at data retrieved from Stripe Subscription object.
   * Will be a of "timestamp" format
   * Ref: https://docs.stripe.com/api/subscriptions/object#subscription_object-cancel_at
   */
  canceled_at?: string;
}

/**
 * Only these fields can be updated on a contribution. They do not overlap with
 * fields returned from a GET on the endpoint.
 */
export interface PortalContributionUpdate {
  provider_payment_method_id?: string;
  /**
   * Amount in integer cents, not dollars. Integers are used here because that's
   * how Stripe stores amounts.
   */
  amount?: number;
  /**
   * Donor-selected amount in dollars, not integer cents. Dollars are used here
   * because this is a metadata field we've defined that is in Stripe.
   */
  donor_selected_amount?: number;
}

// If errors occur when updating a contribution, they're currently returned as
// an array of strings in the response. Undefined here is because we may not get
// this array in all cases when an error occurs.
export type UpdateContributionErrors = string[] | undefined;

// This interface can be altered to include other errors that may be returned from the API.
export interface CancelContributionValidationErrors {
  detail?: string;
}

/**
 * Possible types of updates: used to display a success message to the user.
 */
export type PortalContributionUpdateType = 'paymentMethod' | 'billingDetails';

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

  // Refresh the contribution details and list after 15 seconds to allow the backend / stripe to process the cancellation.
  const refreshAfterTimeout = useCallback(
    (timeout = 15000) => {
      setTimeout(() => {
        queryClient.invalidateQueries(['portalContributionList']);
        queryClient.invalidateQueries(['portalContribution', contributorId, contributionId]);
      }, timeout);
    },
    [contributionId, contributorId, queryClient]
  );

  const { mutateAsync: cancelContribution } = useMutation(
    async () => {
      return await axios.delete<PortalContributionDetail>(getContributionDetailEndpoint(contributorId, contributionId));
    },
    {
      onSuccess: () => {
        // Invalidate contribution details for `is_cancelable` to be updated.
        queryClient.invalidateQueries(['portalContribution', contributorId, contributionId]);

        refreshAfterTimeout();

        enqueueSnackbar('Your contribution has been successfully canceled.', {
          persist: true,
          content: (key: string, message: string) => (
            <SystemNotification id={key} message={message} header="Contribution canceled" type="success" />
          )
        });
      },
      onError: (error: AxiosError<CancelContributionValidationErrors>) => {
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

  const updateContributionMutation = useMutation(
    (update: { data: PortalContributionUpdate; type: PortalContributionUpdateType }) => {
      return axios.patch(getContributionDetailEndpoint(contributorId, contributionId), update.data);
    },
    {
      onError: (error: AxiosError<UpdateContributionErrors>) => {
        const message = Array.isArray(error.response?.data) ? error.response?.data[0] : 'Please try again.';

        enqueueSnackbar(`Billing details failed to save changes. ${message}`, {
          persist: true,
          content: (key: string, message: string) => (
            <SystemNotification id={key} message={message} header="Billing Update Not Saved" type="error" />
          )
        });
      },
      onSuccess: (_, { type }) => {
        let message = undefined;

        switch (type) {
          case 'paymentMethod':
            message = 'Payment method has successfully been updated.';
            break;

          case 'billingDetails':
            message =
              'Your billing details have been successfully updated. Changes may not be reflected in portal immediately.';
            break;

          default:
            // Should never happen. Since we're just showing a notification,
            // let the user proceed, log an error and keep going.
            console.error(`Don't know how to show success notification for update type "${type}"`);
        }

        if (message) {
          enqueueSnackbar(message, {
            persist: true,
            content: (key: string, message: string) => (
              <SystemNotification id={key} message={message} header="Billing Updated" type="success" />
            )
          });
        }

        queryClient.invalidateQueries(['portalContribution', contributorId, contributionId]);

        refreshAfterTimeout();
      }
    }
  );
  const updateContribution = useCallback(
    (data: PortalContributionUpdate, type: PortalContributionUpdateType) =>
      updateContributionMutation.mutateAsync({ data, type }),
    [updateContributionMutation]
  );

  const sendEmailReceiptMutation = useMutation(
    () => axios.post(getContributionSendEmailReceiptEndpoint(contributorId, contributionId)),
    {
      onError: () => {
        enqueueSnackbar('Your receipt has failed to send to your email. Please wait and try again.', {
          persist: true,
          content: (key: string, message: string) => (
            <SystemNotification id={key} message={message} header="Failed to Send" type="error" />
          )
        });
      },
      onSuccess: () => {
        enqueueSnackbar('Your receipt has been sent to your email.', {
          persist: true,
          content: (key: string, message: string) => (
            <SystemNotification id={key} message={message} header="Receipt Sent!" type="success" />
          )
        });
      }
    }
  );
  const sendEmailReceipt = useCallback(() => sendEmailReceiptMutation.mutateAsync(), [sendEmailReceiptMutation]);

  return {
    contribution: data,
    isError,
    isFetching,
    isLoading,
    refetch,
    updateContribution,
    cancelContribution,
    sendEmailReceipt
  };
}
