import * as Sentry from '@sentry/react';
import { PaymentMethodCreateParams } from '@stripe/stripe-js';
import { useMutation } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { useCookies } from 'react-cookie';
import axios from 'ajax/axios';
import { AUTHORIZE_STRIPE_PAYMENT_ROUTE } from 'ajax/endpoints';
import { CSRF_HEADER } from 'appSettings';
import { serializeData } from 'components/paymentProviders/stripe/stripeFns';
import { CONTRIBUTION_INTERVALS, ContributionInterval } from 'constants/contributionIntervals';
import { ContributionPage } from './useContributionPage';
import { AxiosError } from 'axios';

export type PaymentData = ReturnType<typeof serializeData>;

export interface Payment {
  /**
   * Amount of the payment in the page currency. This only includes the numeric
   * part of the amount, not any currency symbol.
   */
  amount: string;
  /**
   * Currency used in this payment.
   */
  currency: NonNullable<ContributionPage['currency']>;
  /**
   * Email hash returned by the API.
   */
  emailHash: string;
  /**
   * How often the payment will occur.
   */
  interval: ContributionInterval;
  /**
   * Slug of the page.
   */
  pageSlug: string;
  /**
   * Slug of the revenue program the page belongs to.
   */
  revenueProgramSlug: string;
  stripe: {
    /**
     * Stripe account ID to use. This belongs to the contribution page's
     * organization, *not* NRH.
     */
    accountId: string;
    /**
     * Billing details to set when finalizing the payment.
     */
    billingDetails: PaymentMethodCreateParams.BillingDetails;
    /**
     * Client secret that should be used to set up Stripe payment elements to
     * finalize the payment.
     */
    clientSecret: string;
  };
  /**
   * Where to send the user when the payment is successfully finalized.
   */
  thankYouUrl: string;
  /**
   * ID of the payment.
   */
  uuid: string;
}

/**
 * Response received from the API when POSTing to /payments.
 */
interface PaymentCreationResponse {
  /**
   * Email hash returned by the API.
   */
  email_hash: string;
  /**
   * Client secret that should be used to set up Stripe payment elements to
   * finalize the payment.
   */
  client_secret: string;
  /**
   * Rev Engine ID of the payment.
   */
  uuid: string;
}

/**
 * Manages a payment created when a user completes a contribution form. This
 * encapsulates a NRE contribution and a Stripe client secret that can be used
 * to display a payment form using Stripe Elements. This hook can't finalize a
 * payment directly; you need to set up a Stripe Elements instance to do so.
 *
 * Each invocation of this hook uses a separate payment.
 */
export function usePayment() {
  const [cookies] = useCookies(['csrftoken']);
  const [payment, setPayment] = useState<Payment>();

  // Because the SPA Axios instance only uses the CSRF token in local storage,
  // we need to manually insert it into requests.

  const createPaymentMutation = useMutation((paymentData: PaymentData) =>
    axios.post<PaymentCreationResponse>(AUTHORIZE_STRIPE_PAYMENT_ROUTE, paymentData, {
      headers: { [CSRF_HEADER]: cookies.csrftoken }
    })
  );
  const createPayment = useCallback(
    async (paymentData: PaymentData, page: ContributionPage) => {
      // Set the user in Sentry so if there are any problems, we have work
      // backwards to find them in Sentry. This needs to happen immediately so
      // that if anything goes wrong here, the user is identified.

      Sentry.setUser({
        email: (paymentData.email as string | null) ?? '<unset>',
        firstName: paymentData.first_name,
        lastName: paymentData.last_name
      });

      // A published page should always have a slug, so this shouldn't happen in
      // practice.

      if (page.slug === null) {
        throw new Error('Page has no slug set');
      }

      if (!paymentData.mailing_country || paymentData.mailing_country === '') {
        throw new Error('Country must be set');
      }

      if (typeof paymentData.interval !== 'string') {
        throw new Error('Interval must be set');
      }

      if (!Object.values(CONTRIBUTION_INTERVALS).includes(paymentData.interval as any)) {
        throw new Error(`Interval isn't a recognized value: ${paymentData.interval}`);
      }

      if (!page.payment_provider.stripe_account_id) {
        throw new Error('Stripe account ID must be set');
      }

      return createPaymentMutation.mutateAsync(paymentData, {
        onError(error) {
          const { response } = error as AxiosError;
          // Log the response (if any) in Sentry, but not for 403, which are normal/expected
          if (response?.data && response?.status !== 403) {
            console.error(`Error creating payment: ${JSON.stringify(response!.data)}`);
          }
        },
        onSuccess({ data }) {
          setPayment({
            amount: paymentData.amount,
            currency: page.currency ?? { code: 'USD', symbol: '$' },
            emailHash: data.email_hash,
            interval: paymentData.interval as ContributionInterval,
            pageSlug: page.slug!,
            revenueProgramSlug: page.revenue_program.slug,
            stripe: {
              // Checked before the mutation runs.
              accountId: page.payment_provider.stripe_account_id!,
              billingDetails: {
                name: `${paymentData.first_name}${paymentData.first_name ? ' ' : ''}${paymentData.last_name}`,
                email: paymentData.email as string,
                // Stripe will complain if it's null or undefined, and it's an
                // optional field.
                phone: typeof paymentData.phone === 'string' ? paymentData.phone : '',
                address: {
                  // Stripe complains if any of the fields are missing, so we
                  // default to empty string.
                  city: typeof paymentData.mailing_city === 'string' ? paymentData.mailing_city : '',
                  country: paymentData.mailing_country,
                  line1: typeof paymentData.mailing_street === 'string' ? paymentData.mailing_street : '',
                  line2: typeof paymentData.mailing_complement === 'string' ? paymentData.mailing_complement : '',
                  postal_code:
                    typeof paymentData.mailing_postal_code === 'string' ? paymentData.mailing_postal_code : '',
                  state: typeof paymentData.mailing_state === 'string' ? paymentData.mailing_state : ''
                }
              },
              clientSecret: data.client_secret
            },
            thankYouUrl: page.thank_you_redirect,
            uuid: data.uuid
          });
        }
      });
    },
    [createPaymentMutation]
  );
  const deletePaymentMutation = useMutation(() =>
    axios.delete(`${AUTHORIZE_STRIPE_PAYMENT_ROUTE}${payment?.uuid}/`, {
      headers: { [CSRF_HEADER]: cookies.csrftoken }
    })
  );
  const deletePayment = useCallback(
    () =>
      deletePaymentMutation.mutateAsync(undefined, {
        onSuccess: () => setPayment(undefined)
      }),
    [deletePaymentMutation]
  );

  if (payment) {
    return { payment, deletePayment };
  }

  return { createPayment, isLoading: createPaymentMutation.isLoading };
}
