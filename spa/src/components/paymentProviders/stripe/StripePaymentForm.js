import { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';

import { useLocation } from 'react-router-dom';

import BackButton from 'components/common/Button/BackButton/BackButton';
import * as S from './StripePaymentForm.styled';
import { usePage } from 'components/donationPage/DonationPage';
import { ICONS } from 'assets/icons/SvgIcon';
import DonationPageDisclaimer from 'components/donationPage/DonationPageDisclaimer';
import { getFrequencyThankYouText } from 'utilities/parseFrequency';
import { useAlert } from 'react-alert';
import { getPaymentSuccessUrl } from './stripeFns';

function StripePaymentForm() {
  const {
    page,
    page: {
      thank_you_redirect,
      slug: pageSlug,
      revenue_program: { slug: rpSlug }
    },
    frequency,
    totalAmount: amount,
    contributorEmail,
    emailHash,
    stripeBillingDetails,
    paymentSubmitButtonText,
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
      pathName: pathname,
      stripeClientSecret: stripeClientSecret
    });

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url, payment_method_data: { billing_details: stripeBillingDetails } }
    });

    // The Stripe docs note that this point will only be reached if there is an
    // immediate error when confirming the payment. Otherwise, contributor gets redirected
    // to `return_url` before the promise above ever resolves.
    if (!['card_error', 'validation_error'].includes(error?.type)) {
      alert.error('An unexpected error occurred');
    }
    setIsLoading(false);
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
      <BackButton onClick={cancelPayment} />
      <form onSubmit={handleSubmit} name="stripe-payment-form">
        <PaymentElement options={paymentElementOptions} id="stripe-payment-element" />
        <S.PaymentSubmitButton type="submit" disabled={isLoading} loading={isLoading} data-testid="donation-submit">
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
