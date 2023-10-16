import { StripePaymentElementOptions } from '@stripe/stripe-js';
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import PropTypes, { InferProps } from 'prop-types';
import { FormEvent, useMemo, useState } from 'react';
import { useAlert } from 'react-alert';
import { useLocation } from 'react-router-dom';
import { ICONS } from 'assets/icons/SvgIcon';
import { getPaymentElementButtonText, getPaymentSuccessUrl } from 'components/paymentProviders/stripe/stripeFns';
import { Payment } from 'hooks/usePayment';
import { getFrequencyThankYouText } from 'utilities/parseFrequency';
import { Icon, IconWrapper, SubmitButton, Form } from './StripePaymentForm.styled';
import i18n from 'i18n';

const StripePaymentFormPropTypes = {
  payment: PropTypes.object.isRequired
};

export interface StripePaymentFormProps extends InferProps<typeof StripePaymentFormPropTypes> {
  payment: Payment;
}

export const STRIPE_ERROR_MESSAGE = i18n.t('donationPage.stripePaymentForm.errorProcessingPayment');

export function StripePaymentForm({ payment }: StripePaymentFormProps) {
  const alert = useAlert();
  const elements = useElements();
  const { pathname } = useLocation();
  const stripe = useStripe();

  // We do this to allow Cypress to spy on calls made to Stripe JS entities in
  // testing.

  if ((window as any).Cypress) {
    (window as any).stripe = stripe;
  }

  const paymentSubmitButtonText = useMemo(
    () =>
      getPaymentElementButtonText({
        currencyCode: payment.currency.code,
        currencySymbol: payment.currency.symbol,
        frequency: payment.interval,
        amount: parseFloat(payment.amount),
        locale: i18n.language
      }),
    [payment.amount, payment.currency.code, payment.currency.symbol, payment.interval]
  );

  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    // These should never happen in practice.

    if (!elements) {
      throw new Error('Elements not set');
    }

    if (!stripe) {
      throw new Error('Stripe is not set');
    }

    // This is the URL that Stripe will send the user to if payment is successfully
    // processed. We send users to an interstitial payment success page where we can
    // track successful conversion in analytics, before forwarding them on to the default
    // thank you page.

    const return_url = getPaymentSuccessUrl({
      amount: payment.amount,
      baseUrl: window.location.origin,
      contributorEmail: payment.stripe.billingDetails.email ?? '',
      emailHash: payment.emailHash ?? '',
      frequencyDisplayValue: getFrequencyThankYouText(payment.interval),
      pageSlug: payment.pageSlug,
      pathName: pathname,
      rpSlug: payment.revenueProgramSlug,
      thankYouRedirectUrl: payment.thankYouUrl ?? ''
    });

    try {
      // We need to look at the client secret in the payment to determine which
      // function to use when finalizing the payment.
      // - pi: confirmPayment
      // - seti: confirmSetup
      //
      // There is no relationship between interval and these IDs. We have to
      // look at client secret directly.
      // @see https://support.stripe.com/questions/payment-intents-api-vs-setup-intents-api

      let finalizer: 'confirmPayment' | 'confirmSetup';

      if (payment.stripe.clientSecret.startsWith('pi_')) {
        finalizer = 'confirmPayment';
      } else if (payment.stripe.clientSecret.startsWith('seti_')) {
        finalizer = 'confirmSetup';
      } else {
        throw new Error(
          `Don't know how to finalize a Stripe payment with client secret ${payment.stripe.clientSecret}`
        );
      }

      const { error } = await stripe[finalizer]({
        elements,
        confirmParams: { return_url, payment_method_data: { billing_details: payment.stripe.billingDetails } }
      });

      // The Stripe docs note that this point will only be reached if there is
      // an immediate error when confirming the payment. Otherwise, contributor
      // gets redirected to `return_url` before the promise above ever resolves.

      if (error) {
        const errorMessage = ['card_error', 'validation_error'].includes(error.type)
          ? error.message
          : STRIPE_ERROR_MESSAGE;

        alert.error(errorMessage);
      }
    } catch (error) {
      // NB: Our usual expectation is that "expected" errors will be caught by Stripe JS itself in try block
      // and returned as `error`. In practice, we've encountered one Sentry error where a non-promise error
      // occurred and the checkout silently failed (see https://news-revenue-hub.atlassian.net/browse/DEV-2869
      // for more context). This catch ensures that the user will be minimally notified that things went wrong.
      //
      // TODO: [DEV-2921] update this console.error copy after DEV-2342 has landed to account for setup intent
      console.error('Something unexpected happened finalizing Stripe payment', error);
      alert.error(STRIPE_ERROR_MESSAGE);
    } finally {
      setIsLoading(false);
    }
  };

  // for full options, see: https://stripe.com/docs/js/elements_object/create_payment_element
  // notably, can control fonts
  const paymentElementOptions: StripePaymentElementOptions = {
    fields: {
      // we collected name, email, etc. in previous form, so we don't need to display these
      // inputs in Stripe's payment element which defaults to including them. This means
      // we need to add that data when we call stripe.confirmPayment.
      billingDetails: 'never'
    },
    // This removes legal agreements that Stripe may display
    terms: {
      card: 'never'
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <PaymentElement options={paymentElementOptions} id="stripe-payment-element" />
      <SubmitButton type="submit" disabled={isLoading} loading={isLoading}>
        {paymentSubmitButtonText}
      </SubmitButton>
      <IconWrapper>
        <Icon icon={ICONS.STRIPE_POWERED} />
      </IconWrapper>
    </Form>
  );
}

StripePaymentForm.propTypes = StripePaymentFormPropTypes;
export default StripePaymentForm;
