import { useRef } from 'react';
import * as S from './TemporaryStripeCheckoutTest.styled';

import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

import { LS_USER } from 'constants/authConstants';

import { useState, useEffect } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import axios from 'ajax/axios';
import { STRIPE_PAYMENT_INTENT } from 'ajax/endpoints';

function TemporaryStripeCheckoutTest() {
  const stripeRef = useRef(
    loadStripe(process.env.REACT_APP_HUB_STRIPE_API_PUB_KEY || '', {
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
  const [succeeded, setSucceeded] = useState(false);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState('');
  const [disabled, setDisabled] = useState(true);
  const [clientSecret, setClientSecret] = useState('');

  const stripe = useStripe();
  const elements = useElements();

  useEffect(() => {
    // Create PaymentIntent as soon as the page loads
    async function createPaymentIntent() {
      const orgSlug = process.env.REACT_APP_TEST_ORG_SLUG || ''; // get me from url!
      const pageSlug = process.env.REACT_APP_TEST_PAGE_SLUG || ''; // get me from url!
      const contributorEmail = 'test_contributor@caktusgroup.com'; // get me from email input on page
      try {
        const paymentIntentBody = {
          payment_amount: '20.00',
          payment_frequency: 'single',
          org_slug: orgSlug,
          page_slug: pageSlug,
          contributor_email: contributorEmail
        };
        const { data } = await axios.post(STRIPE_PAYMENT_INTENT, paymentIntentBody);
        setClientSecret(data.clientSecret);
      } catch (e) {
        console.error(e.response);
      }
    }
    createPaymentIntent();
  }, []);

  const handleChange = async (event) => {
    // Listen for changes in the CardElement
    // and display any errors as the customer types their card details
    setDisabled(event.empty);
    setError(event.error ? event.error.message : '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    const payload = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: elements.getElement(CardElement)
      }
    });
    if (payload.error) {
      setError(`Payment failed ${payload.error.message}`);
      setProcessing(false);
    } else {
      setError(null);
      setProcessing(false);
      setSucceeded(true);
    }
  };

  return (
    <S.Wrapper>
      <S.FormStyled id="payment-form" onSubmit={handleSubmit}>
        <CardElement id="card-element" options={cardStyle} onChange={handleChange} />
        <button disabled={processing || disabled || succeeded} id="submit">
          <span id="button-text">{processing ? <div className="spinner" id="spinner"></div> : 'Pay now'}</span>
        </button>
        {/* Show any error that happens when processing the payment */}
        {error && (
          <div className="card-error" role="alert">
            {error}
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
