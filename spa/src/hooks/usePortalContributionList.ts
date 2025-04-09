import { useQuery } from '@tanstack/react-query';
import { getContributionsEndpoint } from 'ajax/endpoints';
import axios from 'ajax/portal-axios';
import { ContributionInterval } from 'constants/contributionIntervals';
import { PaymentStatus } from 'constants/paymentStatus';
import queryString from 'query-string';

export type CardBrand = 'amex' | 'diners' | 'discover' | 'jcb' | 'mastercard' | 'unionpay' | 'visa' | 'unknown';

export interface PortalContribution {
  /**
   * Amount **in cents** of the contribution.
   */
  amount: number;
  /**
   * The type of card on the contribution's current payment.
   */
  card_brand: CardBrand;
  /**
   * When the credit card used for the contribution's current payment will
   * expire.
   * @example "4/2024"
   */
  card_expiration_date: string;
  /**
   * Last four digits of the payment card used on the current payment method of
   * the contribution.
   */
  card_last_4: string;
  /**
   * Timestamp of when the contribution was created. This is *not* necessarily
   * when the transaction occurred.
   */
  created: string;
  /**
   * Timestamp of when the first related payment occurred. Migrated
   * contributions might have a null date.
   */
  first_payment_date: string | null;
  /**
   * Internal ID of the contribution.
   */
  id: number;
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
   * Timestamp of when the last related payment occurred. This may be null in
   * recurring contributions that have been migrated from legacy subscriptions.
   */
  last_payment_date: null | string;
  /**
   * Timestamp of when the next related payment will occur, if any.
   */
  next_payment_date: null | string;

  /**
   * How was the payment made?
   */
  payment_type: string;
  /**
   * ID of the revenue program that was contributed to.
   */
  revenue_program: number;
  /**
   * Processing status of the payment.
   */
  status: PaymentStatus;
}

export interface ContributionListResponse {
  count: number;
  next?: string;
  previous?: string;
  results: PortalContribution[];
}

async function fetchContributions(contributorId: number, queryParams?: string) {
  const { data } = await axios.get<ContributionListResponse>(getContributionsEndpoint(contributorId, queryParams));

  return { count: data.count, results: data.results };
}

/**
 * Manages fetching the list of contributions a contributor sees when logging
 * into the portal.
 */
export function usePortalContributionList(
  contributorId?: number,
  revenueProgram?: number,
  queryParams?: { ordering: string; interval?: string }
) {
  const { data, isError, isFetching, isLoading, refetch } = useQuery(
    ['portalContributionList', queryParams?.ordering, queryParams?.interval],
    () =>
      fetchContributions(
        contributorId!,
        queryString.stringify({ ...queryParams, revenue_program: revenueProgram } ?? {})
      ),
    { enabled: !!contributorId && !!revenueProgram, keepPreviousData: true }
  );

  return { contributions: data?.results ?? [], isError, isFetching, isLoading, refetch };
}
