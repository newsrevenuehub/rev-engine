import { useQuery } from '@tanstack/react-query';
import axios from 'ajax/axios';
import { getContributionsEndpoint } from 'ajax/endpoints';
import { ContributionInterval } from 'constants/contributionIntervals';
import { PaymentStatus } from 'constants/paymentStatus';

export type CardBrand = 'amex' | 'diners' | 'discover' | 'jcb' | 'mastercard' | 'unionpay' | 'visa' | 'unknown';

export interface PortalContribution {
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
  last4: string;
  /**
   * Timestamp of when the last related payment occurred.
   */
  last_payment_date: string;
  /**
   * Timestamp of when the next related payment will occur.
   */
  next_payment_date: string;
  /**
   * Internal ID of the payment in the payment processor, e.g. Stripe.
   */
  payment_provider_id: string;
  /**
   * How was the payment made?
   */
  payment_type: string;
  /**
   * Internal ID of the customer in the payment processor, e.g. Stripe.
   */
  provider_customer_id: string;
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

async function fetchContributions(contributorId: number) {
  const { data } = await axios.get<ContributionListResponse>(getContributionsEndpoint(contributorId));

  return { count: data.count, results: data.results };
}

/**
 * Manages fetching the list of contributions a contributor sees when logging
 * into the portal.
 */
export function usePortalContributionList(contributorId?: number) {
  const { data, isError, isFetching, isLoading } = useQuery(
    ['portalContributionList'],
    () => fetchContributions(contributorId!),
    { enabled: !!contributorId, keepPreviousData: true }
  );

  return { contributions: data?.results ?? [], isError, isFetching, isLoading };
}
