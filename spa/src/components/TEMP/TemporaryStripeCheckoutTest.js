import { useState, useCallback, useEffect } from 'react';
import * as S from './TemporaryStripeCheckoutTest.styled';

//Deps
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { useAlert } from 'react-alert';
import { useHistory, useParams, useRouteMatch } from 'react-router-dom';

// Ajax
import axios from 'ajax/axios';
import { ORG_STRIPE_ACCOUNT_ID, STRIPE_PAYMENT_INTENT } from 'ajax/endpoints';

// Elements
import Input from 'elements/inputs/Input';
import TextArea from 'elements/inputs/TextArea';
import Select from 'elements/inputs/Select';
import Spinner from 'elements/Spinner';
import GlobalLoading from 'elements/GlobalLoading';
import { THANK_YOU_SLUG } from 'routes';

function TemporaryStripeCheckoutTest() {
  const [stripe, setStripe] = useState();
  const params = useParams();

  const setOrgStripeAccountId = useCallback(async () => {
    const { data } = await axios.get(ORG_STRIPE_ACCOUNT_ID, {
      params: { revenue_program_slug: params.revProgramSlug }
    });
    const stripeAccount = data.stripe_account_id;
    setStripe(loadStripe(process.env.REACT_APP_HUB_STRIPE_API_PUB_KEY, { stripeAccount }));
  }, [params.revProgramSlug]);

  useEffect(() => {
    setOrgStripeAccountId();
  }, [setOrgStripeAccountId]);

  if (stripe) return <StripeWrapper stripe={stripe} />;
  return <GlobalLoading />;
}

function StripeWrapper({ stripe }) {
  return (
    <S.TemporaryStripeCheckoutTest>
      <p>
        Test Stripe payments with Stripe{' '}
        <a href="https://stripe.com/docs/testing" target="_blank" rel="noopener noreferrer">
          demo card numbers
        </a>
        .
      </p>
      <Elements stripe={stripe}>
        <CheckoutForm />
      </Elements>
    </S.TemporaryStripeCheckoutTest>
  );
}

export default TemporaryStripeCheckoutTest;

function CheckoutForm() {
  const { page } = { page: { thank_you_redirect: '', post_thank_you_redirect: 'https://www.caktusgroup.com' } }; // usePageContext()

  // Form state
  const [paymentType, setPaymentType] = useState('single');
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

  const history = useHistory();
  const alert = useAlert();
  const stripe = useStripe();
  const elements = useElements();
  const { url, params } = useRouteMatch();

  const handleChange = async (event) => {
    // Listen for changes in the CardElement
    // and display any errors as the customer types their card details
    setDisabled(event.empty);
    setErrors({ ...errors, stripe: event.error ? event.error.message : '' });
  };

  const createPaymentIntent = useCallback(() => {
    return new Promise(async (resolve, reject) => {
      const revenue_program_slug = params.revProgramSlug;
      const donation_page_slug = params.pageSlug;
      try {
        const paymentIntentBody = {
          payment_type: paymentType,
          amount,
          revenue_program_slug,
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
  }, [paymentType, amount, email, givenName, familyName, reason, params]);

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

  const confirmPayment = useCallback(
    async (clientSecret) => {
      const payload = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)
        }
      });
      if (payload.error) {
        setErrors({ stripe: `Payment failed ${payload.error.message}` });
        alert.error(`Payment failed ${payload.error.message}`);
        setProcessing(false);
      } else {
        setErrors({});
        setProcessing(false);
        setSucceeded(true);
        handleSuccesfulPayment();
      }
    },
    [elements, stripe, alert, handleSuccesfulPayment]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    createPaymentIntent()
      .then(confirmPayment)
      .catch((e) => {
        const response = e?.response?.data;
        if (response) {
          setErrors({ ...errors, ...e.response.data });
          if (response.detail) alert.error(response.detail);
          setProcessing(false);
        } else {
          alert.error('There was an error processing your payment.');
          setProcessing(false);
        }
      });
  };

  return (
    <S.Wrapper>
      <S.FormStyled id="payment-form" onSubmit={handleSubmit} data-testid="donation-payment-form">
        <Select
          label="Payment type"
          onChange={(e) => setPaymentType(e.target.value)}
          items={['single', 'recurring']}
          placeholder="Select a payment type"
        />
        <Input
          type="number"
          label="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          errors={errors.amount}
          testid="TEMP-payment-amount"
        />
        <Input
          type="email"
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          errors={errors.email}
          testid="donation-email"
        />
        <Input
          type="text"
          label="Given name"
          value={givenName}
          onChange={(e) => setGivenName(e.target.value)}
          errors={errors.givenName}
          testid="donation-given-name"
        />
        <Input
          type="text"
          label="Family name"
          value={familyName}
          onChange={(e) => setFamilyName(e.target.value)}
          errors={errors.familyName}
          testid="donation-family-name"
        />
        <TextArea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          label="Reason for donation"
          testid="donation-reason"
        />
        <div style={{ marginBottom: '2rem' }} />
        <CardElement id="card-element" options={cardStyle} onChange={handleChange} />
        <button disabled={processing || disabled || succeeded} id="submit" data-testid="donation-submit">
          <span id="button-text">{processing ? <Spinner /> : 'Pay now'}</span>
        </button>
        {/* Show any error that happens when processing the payment */}
        {errors.stripe && (
          <div role="alert" data-testid="donation-error">
            {errors.stripe}
          </div>
        )}
        {/* Show a success message upon completion */}
        {succeeded && (
          <p style={{ color: 'whitesmoke' }} data-testid="donation-success">
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
