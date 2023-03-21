import { useState, useMemo } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { useAlert } from 'react-alert';
import { useLocation } from 'react-router-dom';

import BackButton from 'components/common/Button/BackButton/BackButton';
import * as S from './StripePaymentForm.styled';
import { usePage } from 'components/donationPage/DonationPage';
import { ICONS } from 'assets/icons/SvgIcon';
import DonationPageDisclaimer from 'components/donationPage/DonationPageDisclaimer';
import { getFrequencyThankYouText } from 'utilities/parseFrequency';
import { getPaymentSuccessUrl, getPaymentElementButtonText } from './stripeFns';

export const STRIPE_ERROR_MESSAGE = 'Something went wrong processing your payment';

function StripePaymentForm() {
  const {
    page,
    page: {
      thank_you_redirect,
      slug: pageSlug,
      revenue_program: { slug: rpSlug },
      currency: { code: currencyCode, symbol: currencySymbol }
    },
    frequency,
    totalAmount: amount,
    contributorEmail,
    emailHash,
    stripeBillingDetails,
    stripeClientSecret,
    cancelPayment
  } = usePage();
  const { pathname } = useLocation();
  const elements = useElements();
  const stripe = useStripe();
  // we do this to allow Cypress to spy on calls made to Stripe JS entities in testing
  if (window.Cypress) {
    // only when testing
    window.stripe = stripe;
  }

  const paymentSubmitButtonText = useMemo(
    () => getPaymentElementButtonText({ currencyCode, currencySymbol, amount, frequency }),
    [currencyCode, currencySymbol, amount, frequency]
  );

  const [isLoading, setIsLoading] = useState(false);

  const alert = useAlert();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    // This is the URL that Stripe will send the user to if payment is successfully
    // processed. We send users to an interstitial payment success page where we can
    // track successful conversion in analytics, before forwarding them on to the default
    // thank you page.
    const return_url = getPaymentSuccessUrl({
      baseUrl: window.location.origin,
      thankYouRedirectUrl: thank_you_redirect || '',
      amount: amount,
      emailHash: emailHash,
      frequencyDisplayValue: getFrequencyThankYouText(frequency),
      contributorEmail: contributorEmail,
      pageSlug: pageSlug,
      rpSlug: rpSlug,
      pathName: pathname
    });
    try {
      // The stripe client secret will start with `seti_` if the contribution is recurring and was flagged on initial creation.
      // In that case, instead of creating a Stripe Subscription, we create a Stripe SetupIntent, which allows us to
      // create a subscription in the future using the payment method the user supplies in checkout. Otherwise, the client
      // secret will start with `pi_` which is an abbreviation for PaymentIntent.
      const { error } = await stripe[stripeClientSecret.startsWith('seti_') ? 'confirmSetup' : 'confirmPayment']({
        elements,
        confirmParams: { return_url, payment_method_data: { billing_details: stripeBillingDetails } }
      });
      // The Stripe docs note that this point will only be reached if there is an
      // immediate error when confirming the payment. Otherwise, contributor gets redirected
      // to `return_url` before the promise above ever resolves.
      if (error) {
        const errorMessage =
          error.type === 'card_error' || error.type === 'validation_error' ? error.message : STRIPE_ERROR_MESSAGE;
        alert.error(errorMessage);
      }
    } catch (e) {
      // NB: Our usual expectation is that "expected" errors will be caught by Stripe JS itself in try block
      // and returned as `error`. In practice, we've encountered one Sentry error where a non-promise error
      // occurred and the checkout silently failed (see https://news-revenue-hub.atlassian.net/browse/DEV-2869
      // for more context). This catch ensures that the user will be minimally notified that things went wrong.
      //
      // TODO: [DEV-2921] update this console.error copy after DEV-2342 has landed to account for setup intent
      console.error('Something unexpected happened finalizing Stripe payment');
      alert.error(STRIPE_ERROR_MESSAGE);
    } finally {
      setIsLoading(false);
    }
  };

  // for full options, see: https://stripe.com/docs/js/elements_object/create_payment_element
  // notably, can control fonts
  const paymentElementOptions = {
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
    <S.StripePaymentForm>
      <form onSubmit={handleSubmit}>
        <BackButton onClick={cancelPayment} />
        <PaymentElement options={paymentElementOptions} id="stripe-payment-element" />
        <S.PaymentSubmitButton type="submit" disabled={isLoading} loading={isLoading}>
          {paymentSubmitButtonText}
        </S.PaymentSubmitButton>

        <S.IconWrapper>
          <S.Icon icon={ICONS.STRIPE_POWERED} />
        </S.IconWrapper>
        <DonationPageDisclaimer page={page} amount={amount} frequency={frequency} />
      </form>
    </S.StripePaymentForm>
  );
}

export default StripePaymentForm;
