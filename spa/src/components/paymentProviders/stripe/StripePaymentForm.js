import * as S from './StripePaymentForm.styled';
import { useState, useCallback } from 'react';

// Deps
import { useTheme } from 'styled-components';
import { useAlert } from 'react-alert';

import { AuthenticationError } from 'ajax/axios';

// Routing
import { useHistory, useRouteMatch } from 'react-router-dom';
import { THANK_YOU_SLUG } from 'routes';

// Stripe
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Ajax
import axios from 'ajax/axios';
import { STRIPE_PAYMENT } from 'ajax/endpoints';

// Context
import { usePage } from 'components/donationPage/DonationPage';

// Children
import Button from 'elements/buttons/Button';
import { getFrequencyAdverb } from 'utilities/parseFrequency';
import { ICONS } from 'assets/icons/SvgIcon';

const STRIPE_PAYMENT_TIMEOUT = 12000;

function StripePaymentForm({ loading, setLoading }) {
  const { page, amount, frequency, fee, payFee, formRef, errors, setErrors } = usePage();

  const [succeeded, setSucceeded] = useState(false);
  const [disabled, setDisabled] = useState(true);

  const theme = useTheme();
  const history = useHistory();
  const alert = useAlert();
  const stripe = useStripe();
  const elements = useElements();
  const { url, params } = useRouteMatch();

  const getTotalAmount = () => {
    let total = amount;
    if (payFee) total += parseFloat(fee);
    return total.toString();
  };

  const handleChange = async (event) => {
    // Listen for changes in the CardElement
    // and display any errors as the customer types their card details
    setDisabled(event.empty);
    setErrors({ ...errors, stripe: event.error ? event.error.message : '' });
  };

  const createPaymentIntent = useCallback((formData) => {
    return new Promise(async (resolve, reject) => {
      try {
        const { data } = await axios.post(STRIPE_PAYMENT, formData, { timeout: STRIPE_PAYMENT_TIMEOUT });
        resolve(data.clientSecret);
      } catch (e) {
        if (e instanceof AuthenticationError) throw e;
        reject(e);
      }
    });
  }, []);

  const handleSuccesfulPayment = useCallback(() => {
    if (page.thank_you_redirect) {
      window.location = page.thank_you_redirect;
    } else {
      history.push({
        pathname: url + THANK_YOU_SLUG,
        state: { page }
      });
    }
  }, [page, history, url]);

  const confirmOneTimePayment = useCallback(
    async (clientSecret) => {
      const payload = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)
        }
      });
      if (payload.error) {
        setErrors({ stripe: `Payment failed ${payload.error.message}` });
        alert.error(`Payment failed ${payload.error.message}`);
        setLoading(false);
      } else {
        setErrors({});
        setLoading(false);
        setSucceeded(true);
        handleSuccesfulPayment();
      }
    },
    [elements, stripe, alert, handleSuccesfulPayment, setLoading, setErrors]
  );

  const handleSinglePayment = (formData) => {
    createPaymentIntent(formData)
      .then(confirmOneTimePayment)
      .catch((e) => {
        const response = e?.response?.data;
        if (response) {
          setErrors({ ...errors, ...e.response.data });
          if (response.detail) alert.error(response.detail);
          setLoading(false);
        } else {
          alert.error('There was an error processing your payment.');
          setLoading(false);
        }
      });
  };

  const createPaymentMethod = async (formData) => {
    return await stripe.createPaymentMethod({
      type: 'card',
      card: elements.getElement(CardElement),
      billing_details: {
        name: `${formData.given_name} ${formData.family_name}`
      }
    });
  };

  const handleRecurringPayment = async (formData) => {
    try {
      const paymentMethodResponse = await createPaymentMethod(formData);
      if (paymentMethodResponse.error) {
        setErrors({ stripe: `Payment failed ${paymentMethodResponse.error.message}` });
        setLoading(false);
        return;
      }

      formData['payment_method_id'] = paymentMethodResponse.paymentMethod.id;

      const response = await axios.post(STRIPE_PAYMENT, formData, { timeout: STRIPE_PAYMENT_TIMEOUT });
      if (response.status === 200) {
        setErrors({});
        setLoading(false);
        setSucceeded(true);
        handleSuccesfulPayment();
      }
    } catch (e) {
      if (e instanceof AuthenticationError) throw e;
      if (e?.response?.data?.detail) {
        setErrors({ stripe: e.response.data.detail });
      } else {
        setErrors({ stripe: 'Payment failed' });
      }
      setLoading(false);
    }
  };

  const serializeForm = (form) => {
    /*
      Rather than trying to hoist all form state up to a common parent,
      we've wrapped the page in a <form> element. Here, we grab a ref
      to that form and turn it in to FormData, then we serialize that 
      form data in to a javascript object.

      This really is easier than management all the form state in a common
      parent. Trust me.
    */
    const obj = {};
    const formData = new FormData(form);
    for (const key of formData.keys()) {
      obj[key] = formData.get(key);
    }
    return obj;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = serializeForm(formRef.current);
    formData['amount'] = getTotalAmount();
    formData['revenue_program_slug'] = params.revProgramSlug;
    formData['donation_page_slug'] = params.pageSlug;

    if (frequency === 'one_time') handleSinglePayment(formData);
    else handleRecurringPayment(formData);
  };

  return (
    <S.StripePaymentForm>
      <S.PaymentElementWrapper>
        <CardElement id="card-element" options={{ style: S.CardElementStyle(theme) }} onChange={handleChange} />
      </S.PaymentElementWrapper>
      <Button
        onClick={handleSubmit}
        disabled={loading || disabled || succeeded || amount === 0}
        loading={loading}
        data-testid="donation-submit"
      >
        Pay ${getTotalAmount()} {getFrequencyAdverb(frequency)}
      </Button>
      {errors.stripe && (
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
