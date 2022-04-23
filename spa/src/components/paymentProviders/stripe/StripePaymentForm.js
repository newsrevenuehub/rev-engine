import * as S from './StripePaymentForm.styled';
import { useState, useEffect } from 'react';

// Deps
import { useTheme } from 'styled-components';
import { useAlert } from 'react-alert';

// Utils
import { getFrequencyAdverb } from 'utilities/parseFrequency';

// Hooks
import useSubdomain from 'hooks/useSubdomain';
import useReCAPTCHAScript from 'hooks/useReCAPTCHAScript';

// Constants
import { GRECAPTCHA_SITE_KEY } from 'settings';

// Routing
import { useHistory, useRouteMatch } from 'react-router-dom';
import { THANK_YOU_SLUG } from 'routes';

// Stripe
import { CardElement, useStripe, useElements, PaymentRequestButtonElement } from '@stripe/react-stripe-js';

// Util
import formatStringAmountForDisplay from 'utilities/formatStringAmountForDisplay';
import submitPayment, { serializeData, getTotalAmount, amountToCents, StripeError } from './stripeFns';

// Context
import { usePage } from 'components/donationPage/DonationPage';

// Analytics
import { useAnalyticsContext } from 'components/analytics/AnalyticsContext';

// Children
import BaseField from 'elements/inputs/BaseField';
import { ICONS } from 'assets/icons/SvgIcon';
import { PayFeesWidget } from 'components/donationPage/pageContent/DPayment';
import DonationPageDisclaimer from 'components/donationPage/DonationPageDisclaimer';

function StripePaymentForm({ loading, setLoading, offerPayFees }) {
  useReCAPTCHAScript();
  const subdomain = useSubdomain();
  const { url, params } = useRouteMatch();
  const { page, amount, frequency, payFee, formRef, setErrors, salesforceCampaignId } = usePage();
  const { trackConversion } = useAnalyticsContext();

  const [cardReady, setCardReady] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const [disabled, setDisabled] = useState(true);
  const [paymentRequest, setPaymentRequest] = useState(null);
  const [forceManualCard, setForceManualCard] = useState(false);
  const [stripeError, setStripeError] = useState();

  const theme = useTheme();
  const history = useHistory();
  const alert = useAlert();
  const stripe = useStripe();
  const elements = useElements();

  const amountIsValid = !isNaN(amount);

  /**
   * Listen for changes in the CardElement and display any errors as the customer types their card details
   */
  const handleCardElementChange = async (event) => {
    setCardReady(event.complete);
    setDisabled(event.empty);
    setStripeError(event?.error?.message);
  };

  /**
   * extractEmailFromFormRef
   * Provided a ref to the form element containing the email address, will return that email address
   * @param {Element} form - a ref to the Form element containing the email addreess
   * @returns {string} email address
   */
  const extractEmailFromFormRef = (form) => {
    const emailInput = form.elements['email'];
    return emailInput.value;
  };

  const getFrequencyText = (frequency) => {
    if (frequency === 'month') return 'monthly';
    if (frequency === 'year') return 'annual';
    if (frequency === 'one_time') return 'one-time';

    return '';
  };

  /****************************\
   * Handle Error and Success *
  \****************************/
  const handlePaymentSuccess = (pr) => {
    if (pr) pr.complete('success');
    const totalAmount = getTotalAmount(amount, payFee, frequency, page.organization_is_nonprofit);
    setErrors({});
    setStripeError(null);
    setLoading(false);
    setSucceeded(true);
    trackConversion(totalAmount);
    if (page.thank_you_redirect) {
      window.location = page.thank_you_redirect;
    } else {
      const email = extractEmailFromFormRef(formRef.current);
      const donationPageUrl = window.location.href;
      history.push({
        pathname: url === '/' ? THANK_YOU_SLUG : url + THANK_YOU_SLUG,
        state: { page, amount: totalAmount, email, donationPageUrl, frequencyText: getFrequencyText(frequency) }
      });
    }
  };

  const handlePaymentFailure = (error, pr) => {
    if (error instanceof StripeError) {
      setStripeError(`Payment failed: ${error}`);
      alert.error(`Payment failed: ${error}`);
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

  /**
   * If window.grecaptcha is defined-- which should be done in useReCAPTCHAScript hook--
   * listen for readiness and resolve promise with resulting reCAPTCHA token.
   * @returns {Promise} - resolves to token or error
   */
  const getReCAPTCHAToken = () =>
    new Promise((resolve, reject) => {
      if (window.grecaptcha) {
        window.grecaptcha.ready(async function () {
          try {
            const token = window.grecaptcha.execute(GRECAPTCHA_SITE_KEY, { action: 'submit' });
            resolve(token);
          } catch (error) {
            reject(error);
          }
        });
      } else {
        reject(new Error('window.grecaptcha not defined at getReCAPTCHAToken call time'));
      }
    });

  /********************************\
   * Inline Card Element Payments *
  \********************************/
  const staticParams = {
    ...params,
    orgIsNonProfit: page.organization_is_nonprofit,
    orgCountry: page.organization_country,
    currency: page.currency?.code?.toLowerCase(),
    salesforceCampaignId,
    revProgramSlug: subdomain,
    pageId: page.id
  };

  const getData = async (state = {}) => {
    const reCAPTCHAToken = await getReCAPTCHAToken();
    const data = serializeData(formRef.current, {
      amount,
      payFee,
      frequency,
      reCAPTCHAToken,
      ...staticParams,
      ...state
    });
    return data;
  };

  const handleCardSubmit = async (e) => {
    e.preventDefault();
    const data = await getData();
    setLoading(true);
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
    const data = await getData(state);
    setLoading(true);
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
    const orgIsNonProfit = page.organization_is_nonprofit;
    const amnt = amountToCents(getTotalAmount(amount, payFee, frequency, orgIsNonProfit));
    if (stripe && amountIsValid && !paymentRequest) {
      const pr = stripe.paymentRequest({
        country: page?.organization_country,
        currency: page?.currency?.code?.toLowerCase(),
        total: {
          label: page.revenue_program.name,
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
        handlePaymentRequestSubmit({ amount, payFee, ...params }, paymentMethodEvent);
      }
      // Remove any previous listeners (with stale data)
      paymentRequest.removeAllListeners();
      // Add updated listener (with updated data)
      paymentRequest.on('paymentmethod', handlePaymentMethodEvent);
    }
    // vv See note above
  }, [paymentRequest, amount, payFee, params]);

  /**
   * See previous note. Here we update the values of our paymentRequest using the
   * paymentRequest.update method.
   */
  useEffect(() => {
    const orgIsNonProfit = page.organization_is_nonprofit;
    const amnt = amountToCents(getTotalAmount(amount, payFee, frequency, orgIsNonProfit));
    const amntIsValid = !isNaN(amnt) && amnt > 0;
    if (paymentRequest && amntIsValid) {
      paymentRequest.update({
        total: {
          label: page.revenue_program.name,
          amount: amnt
        }
      });
    }
  }, [amount, payFee, paymentRequest, frequency]);

  const currencySymbol = page?.currency?.symbol;

  /**
   * getButtonText
   * @returns {string} - The text to display in the submit button.
   */
  const getButtonText = () => {
    const totalAmount = getTotalAmount(amount, payFee, frequency, page.organization_is_nonprofit);
    if (isNaN(totalAmount)) {
      return 'Enter a valid amount';
    }
    return `Give ${currencySymbol}${formatStringAmountForDisplay(totalAmount)} ${getFrequencyAdverb(frequency)}`;
  };

  return (
    <>
      {!forceManualCard && paymentRequest ? (
        <>
          <S.PaymentRequestWrapper>
            {offerPayFees && <PayFeesWidget />}

            <PaymentRequestButtonElement options={{ paymentRequest, style: S.PaymentRequestButtonStyle }} />
          </S.PaymentRequestWrapper>
          <S.PayWithCardOption onClick={() => setForceManualCard(true)}>
            - I prefer to manually enter my credit card -
          </S.PayWithCardOption>
        </>
      ) : (
        <S.StripePaymentForm>
          <BaseField label="Card details" required>
            <S.PaymentElementWrapper>
              <CardElement
                id="card-element"
                options={{ style: S.CardElementStyle(theme), hidePostalCode: true }}
                onChange={handleCardElementChange}
              />
            </S.PaymentElementWrapper>
          </BaseField>
          {stripeError && (
            <S.PaymentError role="alert" data-testid="donation-error">
              {stripeError}
            </S.PaymentError>
          )}
          {offerPayFees && <PayFeesWidget />}

          <S.PaymentSubmitButton
            onClick={handleCardSubmit}
            disabled={!cardReady || loading || disabled || succeeded || !amountIsValid}
            loading={loading}
            data-testid="donation-submit"
          >
            {getButtonText()}
          </S.PaymentSubmitButton>
        </S.StripePaymentForm>
      )}

      <S.IconWrapper>
        <S.Icon icon={ICONS.STRIPE_POWERED} />
      </S.IconWrapper>
      <DonationPageDisclaimer page={page} amount={amount} payFee={payFee} frequency={frequency} />
    </>
  );
}

export default StripePaymentForm;
