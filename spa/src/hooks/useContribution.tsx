import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import axios from 'ajax/axios';
import { getAdminContributionEndpoint, getAdminContributionSendReceiptEndpoint } from 'ajax/endpoints';
import SystemNotification from 'components/common/SystemNotification';
import { ContributionInterval } from 'constants/contributionIntervals';
import { RevenueProgramForContributionPage } from './useContributionPage';

export interface Contribution {
  /**
   * Amount of the contribution in cents, including fees.
   */
  amount: number;
  auto_accepted_on: unknown;
  /**
   * How bad actor scored this contribution. Low is good, high is suspicious.
   */
  bad_actor_score: number | null;
  /**
   * Email of the contributor.
   */
  contributor_email: string;
  /**
   * ISO timestamp when the contribution was originally created.
   */
  created: string;
  /**
   * Currency code of the contribution.
   */
  currency: string;
  /**
   * ID of the contribution page this contribution was made via. null values
   * here are generally set on migrated contributions.
   */
  donation_page_id: null | number;
  /**
   * ISO timestamp of the first payment on the contribution. Might be null if
   * the contribution failed.
   */
  first_payment_date: null | string;
  /**
   * ISO timestamp of when this contribution was flagged, if ever.
   */
  flagged_date: null | string;
  /**
   * Name of the payment provider used, e.g. Stripe.
   */
  formatted_payment_provider_used: string;
  /**
   * ID of the contribution.
   */
  id: number;
  /**
   * How often this contribution recurs.
   */
  interval: ContributionInterval;
  /**
   * Can this contribution be canceled?
   */
  is_cancelable: boolean;
  /**
   * ISO timetstamp of the most recent payment made related to this
   * contribution. Might be null if the contribution failed.
   */
  last_payment_date: null | string;
  /**
   * External URL to view the customer in the payment provider used.
   */
  provider_customer_url: string;
  /**
   * External URL to view the payment related to the contribution in the payment provider.
   */
  provider_payment_url: string;
  /**
   * External URL to view the subscription related to the contribution in the
   * payment provider. null on one-time contributions.
   */
  provider_subscription_url: null | string;
  /**
   * Revenue program this contribution was to.
   */
  revenue_program: RevenueProgramForContributionPage;
  /**
   * Status of the contribution.
   */
  status: 'abandoned' | 'canceled' | 'failed' | 'flagged' | 'paid' | 'processing' | 'refunded' | 'rejected';
}

async function fetchContribution(contributionId: number) {
  const { data } = await axios.get<Contribution>(getAdminContributionEndpoint(contributionId));

  return data;
}

export function useContribution(contributionId: number) {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const { data, isFetching, isError } = useQuery(['contribution', contributionId], () =>
    fetchContribution(contributionId)
  );
  const cancelMutation = useMutation(
    async () => await axios.delete<void>(getAdminContributionEndpoint(contributionId)),
    {
      onSuccess() {
        queryClient.invalidateQueries(['contribution', contributionId]);
        enqueueSnackbar('The recurring contribution was successfully canceled.', {
          persist: true,
          content: (key: string, message: string) => (
            <SystemNotification id={key} message={message} header="Contribution canceled" type="success" />
          )
        });
      },
      onError() {
        enqueueSnackbar('Failed to cancel the recurring contribution. Please wait and try again.', {
          persist: true,
          content: (key: string, message: string) => (
            <SystemNotification id={key} message={message} header="Contribution failed to cancel" type="error" />
          )
        });
      }
    }
  );
  const sendReceiptMutation = useMutation(
    async () => await axios.post<void>(getAdminContributionSendReceiptEndpoint(contributionId)),
    {
      onSuccess() {
        enqueueSnackbar("The receipt has been successfully sent to the contributor's email address.", {
          persist: true,
          content: (key: string, message: string) => (
            <SystemNotification id={key} message={message} header="Receipt sent" type="success" />
          )
        });
      },
      onError() {
        enqueueSnackbar('The receipt failed to send to the contributor. Please wait and try again.', {
          persist: true,
          content: (key: string, message: string) => (
            <SystemNotification id={key} message={message} header="Receipt resend failed" type="error" />
          )
        });
      }
    }
  );

  return { cancelMutation, sendReceiptMutation, contribution: data, isFetching, isError };
}
