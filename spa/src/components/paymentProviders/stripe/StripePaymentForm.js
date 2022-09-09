import { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { useLocation } from 'react-router-dom';

import * as S from './StripePaymentForm.styled';
import { usePage } from 'components/donationPage/DonationPage';
import { ICONS } from 'assets/icons/SvgIcon';
import DonationPageDisclaimer from 'components/donationPage/DonationPageDisclaimer';
import { PAYMENT_SUCCESS } from 'routes';
import { getFrequencyThankYouText } from 'utilities/parseFrequency';
import { useAlert } from 'react-alert';

function getPaymentSuccessUrl(
  thankYouRedirectUrl,
  amount,
  emailHash,
  frequencyDisplayValue,
  contributorEmail,
  pageSlug,
  rpSlug,
  origin,
  pathname
) {
  // This is the URL that Stripe will send the user to if payment is successfully
  // processed. We send users to an interstitial payment success page where we can
  // track successful conversion in analytics, before forwarding them on to the default
  // thank you page.
  const paymentSuccessUrl = new URL(PAYMENT_SUCCESS, origin);
  paymentSuccessUrl.searchParams.append('next', thankYouRedirectUrl);
  paymentSuccessUrl.searchParams.append('amount', amount);
  paymentSuccessUrl.searchParams.append('frequency', frequencyDisplayValue);
  // When a donation page has a custom thank you page that is off-site, we
  // eventually next the user to that page, appending several query parameters, one
  // of which is a `uid` parameter that org's can use to anonymously track contributors
  // in their analytics layer without exposing raw contributor email to ad tech providers.
  paymentSuccessUrl.searchParams.append('uid', emailHash);
  // On other hand, our internal thank you page needs the raw value of the contributor
  // email to display message on the page. There's no privacy concerns around sharing the
  // email address with Stripe (they already have it) or within our site.
  paymentSuccessUrl.searchParams.append('email', contributorEmail);
  // The thank you page that eventually loads needs to data that is on the
  // page model from API. We pass the `pageSlug`, and the success page will be able to use this +
  // the `rpSlug`to request the LIVE_PAGE_DETAIL. Ideally, we'd just use the page
  // id to this end, but at present that API endpoint requires authentication.
  paymentSuccessUrl.searchParams.append('pageSlug', pageSlug);
  paymentSuccessUrl.searchParams.append('rpSlug', rpSlug);
  // We pass this along because the thank you page we eventually need to show
  // will appear at rev-program-slug.revengine.com/page-name/thank-you if the page was served
  // from specific page name. On other hand, if a revenue program has a default donation page
  // set up, that page can appear at rev-program-slug.revengine.com/ (with no page), in which
  // case, the thank-you page URL can be rev-program-slug.revengine.com/thank-you.
  paymentSuccessUrl.searchParams.append('fromPath', pathname);
  return paymentSuccessUrl.href;
}

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
    paymentSubmitButtonText
  } = usePage();
  const { pathname } = useLocation();
  const stripe = useStripe();
  const elements = useElements();

  const [isLoading, setIsLoading] = useState(false);

  const alert = useAlert();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    // This is the URL that Stripe will send the user to if payment is successfully
    // processed. We send users to an interstitial payment success page where we can
    // track successful conversion in analytics, before forwarding them on to the default
    // thank you page.
    const return_url = getPaymentSuccessUrl(
      thank_you_redirect || '',
      amount,
      emailHash,
      getFrequencyThankYouText(frequency),
      contributorEmail,
      pageSlug,
      rpSlug,
      window.location.origin,
      pathname
    );

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
      <form onSubmit={handleSubmit}>
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
