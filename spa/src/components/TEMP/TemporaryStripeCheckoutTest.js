import { useState, useRef, useCallback } from 'react';
import * as S from './TemporaryStripeCheckoutTest.styled';

import { LS_USER } from 'constants/authConstants';
//Deps
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { useAlert } from 'react-alert';

// Ajax
import axios from 'ajax/axios';
import { STRIPE_PAYMENT_INTENT } from 'ajax/endpoints';

// Elements
import Input from 'components/elements/inputs/Input';

function TemporaryStripeCheckoutTest() {
  const stripeRef = useRef(
    loadStripe(process.env.REACT_APP_HUB_STRIPE_API_PUB_KEY, {
      stripeAccount: JSON.parse(localStorage.getItem(LS_USER)).organization.stripe_account_id
    })
  );

  return (
    <S.TemporaryStripeCheckoutTest>
      <p>
        Test Stripe payments with Stripe{' '}
        <a href="https://stripe.com/docs/testing" target="_blank" rel="noopener noreferrer">
          demo card numbers
        </a>
        .
      </p>
      <Elements stripe={stripeRef.current}>
        <CheckoutForm />
      </Elements>
    </S.TemporaryStripeCheckoutTest>
  );
}

export default TemporaryStripeCheckoutTest;

function CheckoutForm() {
  // Form state
  const [paymentType, setPaymentType] = useState('');
  const [amount, setAmount] = useState('');
  const [email, setEmail] = useState('');
  const [givenName, setGivenName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [reason, setReason] = useState('');

  // Async state
  const [succeeded, setSucceeded] = useState(false);
  const [errors, setErrors] = useState({});
  const [processing, setProcessing] = useState('');
  const [disabled, setDisabled] = useState(true);

  const alert = useAlert();
  const stripe = useStripe();
  const elements = useElements();

  const handleChange = async (event) => {
    // Listen for changes in the CardElement
    // and display any errors as the customer types their card details
    setDisabled(event.empty);
    setErrors({ ...errors, stripe: event.error ? event.error.message : '' });
  };

  const createPaymentIntent = useCallback(() => {
    return new Promise(async (resolve, reject) => {
      const organization_slug = process.env.REACT_APP_TEST_ORG_SLUG || ''; // get me from url!
      const donation_page_slug = process.env.REACT_APP_TEST_PAGE_SLUG || ''; // get me from url!
      try {
        const paymentIntentBody = {
          payment_type: paymentType,
          amount,
          organization_slug,
          donation_page_slug,
          email,
          given_name: givenName,
          family_name: familyName,
          reason
        };
        const { data } = await axios.post(STRIPE_PAYMENT_INTENT, paymentIntentBody);
        resolve(data.clientSecret);
      } catch (e) {
        reject(e);
      }
    });
  }, [paymentType, amount, email, givenName, familyName, reason]);

  const confirmPayment = useCallback(
    async (clientSecret) => {
      const payload = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)
        }
      });
      if (payload.error) {
        setErrors({ stripe: `Payment failed ${payload.error.message}` });
        setProcessing(false);
      } else {
        setErrors({});
        setProcessing(false);
        setSucceeded(true);
      }
    },
    [elements, stripe]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    createPaymentIntent()
      .then(confirmPayment)
      .catch((e) => {
        debugger;
        console.log('ERROR THO: ', e.response);
        if (e?.response?.data) {
          setErrors({ ...errors, ...e.response.data });
        } else {
          alert.error('There was an error processing your payment.');
        }
      });
  };

  return (
    <S.Wrapper>
      <S.FormStyled id="payment-form" onSubmit={handleSubmit}>
        <div style={{ width: 350, marginBottom: '2rem' }}>
          <label style={{ display: 'block', color: 'white' }}>Payment type</label>
          <select value={paymentType} onChange={(e) => setPaymentType(e.target.value)}>
            <option value="single">Single</option>
            <option value="recurring">Recurring</option>
          </select>
          <Input
            type="number"
            label="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            errors={errors.amount}
          />
          <Input
            type="email"
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            errors={errors.email}
          />
          <Input
            type="text"
            label="Given name"
            value={givenName}
            onChange={(e) => setGivenName(e.target.value)}
            errors={errors.givenName}
          />
          <Input
            type="text"
            label="Family name"
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            errors={errors.familyName}
          />
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <CardElement id="card-element" options={cardStyle} onChange={handleChange} />
        <button disabled={processing || disabled || succeeded} id="submit">
          <span id="button-text">{processing ? <div className="spinner" id="spinner"></div> : 'Pay now'}</span>
        </button>
        {/* Show any error that happens when processing the payment */}
        {errors.stripe && (
          <div className="card-error" role="alert">
            {errors.stripe}
          </div>
        )}
        {/* Show a success message upon completion */}
        {succeeded && (
          <p style={{ color: 'whitesmoke' }} className={succeeded ? 'result-message' : 'result-message hidden'}>
            Payment succeeded, see the result in your
            <a style={{ color: 'slategrey' }} href={`https://dashboard.stripe.com/test/payments`}>
              {' '}
              Stripe dashboard.
            </a>{' '}
            Refresh the page to pay again.
          </p>
        )}
      </S.FormStyled>
    </S.Wrapper>
  );
}

const cardStyle = {
  style: {
    base: {
      color: 'whitesmoke',
      iconColor: 'whitesmoke',
      fontFamily: 'Arial, sans-serif',
      fontSmoothing: 'antialiased',
      fontSize: '16px',
      '::placeholder': {
        color: 'whitesmoke'
      }
    },
    invalid: {
      color: '#fa755a',
      iconColor: '#fa755a'
    }
  }
};
