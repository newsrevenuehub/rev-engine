import * as S from './StripePaymentForm.styled';
import { useState, useEffect } from 'react';

// Deps
import { useTheme } from 'styled-components';
import { useAlert } from 'react-alert';

// Utils
import { getFrequencyAdverb } from 'utilities/parseFrequency';

// Routing
import { useHistory, useRouteMatch } from 'react-router-dom';
import { THANK_YOU_SLUG } from 'routes';

// Stripe
import { CardElement, useStripe, useElements, PaymentRequestButtonElement } from '@stripe/react-stripe-js';

// Util
import submitPayment, { serializeData, getTotalAmount, amountToCents, StripeError } from './stripeFns';

// Context
import { usePage } from 'components/donationPage/DonationPage';

// Children
import Button from 'elements/buttons/Button';
import { ICONS } from 'assets/icons/SvgIcon';

const STRIPE_PAYMENT_REQUEST_LABEL = 'RevEngine Donation';

function StripePaymentForm({ loading, setLoading }) {
  const { url, params } = useRouteMatch();
  const { page, amount, frequency, fee, payFee, formRef, errors, setErrors } = usePage();

  const [succeeded, setSucceeded] = useState(false);
  const [disabled, setDisabled] = useState(true);
  const [paymentRequest, setPaymentRequest] = useState(null);
  const [forceManualCard, setForceManualCard] = useState(false);

  const theme = useTheme();
  const history = useHistory();
  const alert = useAlert();
  const stripe = useStripe();
  const elements = useElements();

  /**
   * Listen for changes in the CardElement and display any errors as the customer types their card details
   */
  const handleChange = async (event) => {
    setDisabled(event.empty);
    setErrors({ ...errors, stripe: event.error ? event.error.message : '' });
  };

  /****************************\
   * Handle Error and Success *
  \****************************/
  const handlePaymentSuccess = (pr) => {
    if (pr) pr.complete('success');
    setErrors({});
    setLoading(false);
    setSucceeded(true);
    if (page.thank_you_redirect) {
      window.location = page.thank_you_redirect;
    } else {
      history.push({
        pathname: url + THANK_YOU_SLUG,
        state: { page }
      });
    }
  };

  const handlePaymentFailure = (error, pr) => {
    if (error instanceof StripeError) {
      setErrors({ stripe: `Payment failed ${error.message}` });
      alert.error(`Payment failed ${error.message}`);
    } else {
      const internalErrors = error?.response?.data;
      if (internalErrors) {
        setErrors({ ...internalErrors });
        if (internalErrors.detail) alert.error(internalErrors.detail);
      } else {
        alert.error('There was an error processing your payment.');
      }
    }
    // "Success" here to the Stripe PaymentRequest API only means "we're done with the pop-up".
    // We fire it here to close the popup and show the user any errors.
    if (pr) pr.complete('success');
    setSucceeded(false);
    setLoading(false);
  };

  /********************************\
   * Inline Card Element Payments *
  \********************************/
  const handleCardSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const data = serializeData(formRef.current, { amount, fee, payFee, ...params });
    await submitPayment(
      stripe,
      data,
      { card: elements.getElement(CardElement) },
      handlePaymentSuccess,
      handlePaymentFailure
    );
  };

  /*********************************\
   * PaymentRequestButton Payments *
  \*********************************/
  const handlePaymentRequestSubmit = async (state, paymentRequest) => {
    setLoading(true);
    const data = serializeData(formRef.current, state);
    await submitPayment(
      stripe,
      data,
      { paymentRequest },
      () => handlePaymentSuccess(paymentRequest),
      (error) => handlePaymentFailure(error, paymentRequest)
    );
  };

  /**
   * Here we initialize and verify a Stripe PaymentRequest, which represents a
   * third-party payment method such as Apple Pay, Google Pay, or various
   * Browser-saved card features (Chrome or Edge or Safari have things).
   *
   * Note that stripe will not respond to changes in dynamic values like
   * amount. For that, we must use the paymentRequest.update method.
   */
  useEffect(() => {
    const amnt = amountToCents(getTotalAmount(amount));
    const amountIsValid = !isNaN(amnt) && amnt > 0;
    if (stripe && amountIsValid && !paymentRequest) {
      const pr = stripe.paymentRequest({
        country: 'US',
        currency: 'usd',
        total: {
          label: STRIPE_PAYMENT_REQUEST_LABEL,
          amount: amnt
        }
      });

      pr.canMakePayment().then((canMakePayment) => {
        if (canMakePayment) setPaymentRequest(pr);
      });
    }
    // vv See note above
  }, [stripe, paymentRequest]);

  /**
   * Here we assign a callback to the paymentmethod event in which we submit the payment
   * with a paymentMethod and current non-form values. We should NOT include handlePaymentRequestSubmit
   * as a dependency here. We're passing in everything it needs as an arg, and the only thing it uses
   * that is not passed in are setState calls which are already memoized.
   */
  useEffect(() => {
    if (paymentRequest) {
      function handlePaymentMethodEvent(paymentMethodEvent) {
        handlePaymentRequestSubmit({ amount, fee, payFee, ...params }, paymentMethodEvent);
      }
      // Remove any previous listeners (with stale data)
      paymentRequest.removeAllListeners();
      // Add updated listener (with updated data)
      paymentRequest.on('paymentmethod', handlePaymentMethodEvent);
    }
    // vv See note above
  }, [paymentRequest, amount, fee, payFee, params]);

  /**
   * See previous note. Here we update the values of our paymentRequest using the
   * paymentRequest.update method.
   */
  useEffect(() => {
    const amnt = amountToCents(getTotalAmount(amount));
    const amountIsValid = !isNaN(amnt) && amnt > 0;
    if (paymentRequest && amountIsValid) {
      paymentRequest.update({
        total: {
          label: STRIPE_PAYMENT_REQUEST_LABEL,
          amount: amnt
        }
      });
    }
  }, [amount, fee, payFee, paymentRequest]);

  // We add a catch here for the times when the ad-hoc donation amount ("other") value
  // is not a valid number (e.g. first clicking on the element, or typing a decimal "0.5")
  if (isNaN(amount) || amount <= 0) return <S.EnterValidAmount>Enter a valid donation amount</S.EnterValidAmount>;
  return !forceManualCard && paymentRequest ? (
    <>
      <S.PaymentRequestWrapper>
        <PaymentRequestButtonElement options={{ paymentRequest, style: S.PaymentRequestButtonStyle }} />
      </S.PaymentRequestWrapper>
      <S.PayWithCardOption onClick={() => setForceManualCard(true)}>
        -- or manually enter credit card --
      </S.PayWithCardOption>
    </>
  ) : (
    <S.StripePaymentForm>
      <S.PaymentElementWrapper>
        <CardElement id="card-element" options={{ style: S.CardElementStyle(theme) }} onChange={handleChange} />
      </S.PaymentElementWrapper>
      <Button
        onClick={handleCardSubmit}
        disabled={loading || disabled || succeeded || amount === 0}
        loading={loading}
        data-testid="donation-submit"
      >
        Give ${getTotalAmount(amount, fee, payFee)} {getFrequencyAdverb(frequency)}
      </Button>
      {errors?.stripe && (
        <S.PaymentError role="alert" data-testid="donation-error">
          {errors.stripe}
        </S.PaymentError>
      )}
      <S.IconWrapper>
        <S.Icon icon={ICONS.STRIPE_POWERED} />
      </S.IconWrapper>
    </S.StripePaymentForm>
  );
}

export default StripePaymentForm;
