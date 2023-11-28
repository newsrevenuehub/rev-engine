import { useMutation, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { useAlert } from 'react-alert';
import axios from 'ajax/axios';
import { CONTRIBUTIONS, SUBSCRIPTIONS } from 'ajax/endpoints';
import { ContributionInterval } from 'constants/contributionIntervals';
import { PaymentStatus } from 'constants/paymentStatus';

export type CardBrand = 'amex' | 'diners' | 'discover' | 'jcb' | 'mastercard' | 'unionpay' | 'visa' | 'unknown';

/**
 * A single contribution returned from the API for the person who made it.
 * **Contributions retrieved by an org or hub admin have a different shape.**
 */
export interface ContributorContribution {
  /**
   * Amount **in cents** of the contribution.
   */
  amount: number;
  /**
   * What payment card was used on the contribution.
   */
  card_brand: CardBrand;
  /**
   * Timestamp of when the contribution was created.
   */
  created: string;
  /**
   * When the credit card used for the contribution will expire.
   * @example "4/2024"
   */
  credit_card_expiration_date: string;
  /**
   * Internal ID for the contribution.
   */
  id: string;
  /**
   * How often the contribution is being made.
   */
  interval: ContributionInterval;
  /**
   * Can the contribution be cancelled?
   */
  is_cancelable: boolean;
  /**
   * Can the contribution be modified? (e.g. to change its payment method)
   */
  is_modifiable: boolean;
  /**
   * Last four digits of the payment card used on the contribution.
   */
  last4: number;
  /**
   * Timestamp of when the last payment occurred related
   */
  last_payment_date: string;
  /**
   * How was the payment made?
   */
  payment_type: string;
  /**
   * Internal ID of the customer in the payment processor, e.g. Stripe.
   */
  provider_customer_id: string;
  /**
   * Slug of the revenue program that was contributed to.
   */
  revenue_program: string;
  /**
   * Processing status of the payment.
   */
  status?: PaymentStatus;
  /**
   * Stripe account ID that received the contribution.
   */
  stripe_account_id: string;
  /**
   * Stripe subscription ID, if this is a recurring contribution.
   */
  subscription_id?: string;
}

export interface UseContributionListQueryParams {
  ordering?: string;
  page?: number;
  page_size?: number;
  rp?: string;
}

export interface FetchContributorsContributionsResponse {
  count: number;
  next?: string;
  previous?: string;
  results: ContributorContribution[];
}

async function fetchContributions(queryParams?: UseContributionListQueryParams) {
  const { data } = await axios.get<FetchContributorsContributionsResponse>(CONTRIBUTIONS, { params: queryParams });

  return { count: data.count, results: data.results };
}

export interface UseContributorContributionListResult {
  cancelRecurringContribution: (contribution: ContributorContribution) => Promise<void>;
  contributions: ContributorContribution[];
  isError: UseQueryResult['isError'];
  isFetching: UseQueryResult['isFetching'];
  isLoading: UseQueryResult['isLoading'];
  refetch: UseQueryResult['refetch'];
  total: number;
}

/**
 * Manages contribution data for the logged-in contributor user. **This returns
 * different data than what what an org or Hub admin would receive.**
 *
 * @deprecated
 */
export function useContributorContributionList(
  queryParams?: UseContributionListQueryParams
): UseContributorContributionListResult {
  const alert = useAlert();
  const queryClient = useQueryClient();
  const mergedParams = useMemo(() => ({ ordering: '-created,contributor_email', ...queryParams }), [queryParams]);

  // Our query is keyed on query params. This is important because uses of this
  // hook with different query params will see different data, and cancelling a
  // contribution won't appear to do anything as it's updating a different query
  // under the covers.
  //
  // We use keepPreviousData so that switching pages is smoother.

  const { data, isError, isFetching, isLoading, refetch } = useQuery(
    ['contributorContributions', mergedParams],
    () => fetchContributions(mergedParams),
    { keepPreviousData: true }
  );

  // Basic API request to cancel a recurring subscription.

  const cancelRecurringMutation = useMutation((contribution: ContributorContribution) =>
    axios.delete(`${SUBSCRIPTIONS}${contribution.subscription_id}/`, {
      data: { revenue_program_slug: contribution.revenue_program }
    })
  );

  // This wrapper function presents a simple API for cancelling a contribution
  // _and_ locally removes the contribution from the query result. The reason
  // why we have this is that we don't yet have backend work done to properly
  // update the local contributor cache when one is cancelled. (It gets updated
  // in the backend when the user next logs in.)
  //
  // This means that if the user refreshes their browser or React Query decides
  // to invalidate the cache, the deleting contribution reappears--but there's
  // not much we can do about that here.
  //
  // Backend update that would make this unnecessary is captured in DEV-2391.

  const cancelRecurringContribution = useCallback(
    async (contribution: ContributorContribution) => {
      try {
        if (!contribution.is_cancelable) {
          throw new Error('This contribution is not cancelable');
        }

        await cancelRecurringMutation.mutateAsync(contribution);
        queryClient.setQueryData(['contributorContributions', mergedParams], (old: unknown) => {
          const oldData = old as FetchContributorsContributionsResponse;

          // If there is no data or it seems to be the wrong shape, do nothing.
          // It seems like this only happens if there's a problem with the
          // mutation itself.

          if (!Array.isArray(oldData?.results)) {
            return old;
          }

          // Remove the contribution we just cancelled from existing data.

          return { ...oldData, results: oldData.results.filter(({ id }) => id !== contribution.id) };
        });
        alert.info(
          'Recurring contribution has been canceled. No more payments will be made. Changes may not appear here immediately.',
          { timeout: 8000 }
        );
      } catch (error) {
        // Log it for Sentry and tell the user.

        console.error(error);
        alert.error(
          'We were unable to cancel this recurring contribution. Please try again later. We have been notified of the problem.'
        );
      }
    },
    [alert, cancelRecurringMutation, mergedParams, queryClient]
  );

  return {
    cancelRecurringContribution,
    contributions: data?.results ?? [],
    isError,
    isFetching,
    isLoading,
    refetch,
    total: data?.count ?? 0
  };
}

export default useContributorContributionList;
