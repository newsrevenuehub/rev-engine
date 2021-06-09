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
import { ORG_STRIPE_ACCOUNT_ID, STRIPE_PAYMENT } from 'ajax/endpoints';

// Routing
import { THANK_YOU_SLUG } from 'routes';

// Elements
import Input from 'elements/inputs/Input';
import TextArea from 'elements/inputs/TextArea';
import Select from 'elements/inputs/Select';
import Spinner from 'elements/Spinner';
import GlobalLoading from 'elements/GlobalLoading';

const PAYMENT_INTERVALS = [
  {
    value: 'one-time',
    displayValue: 'One-time'
  },
  {
    value: 'month',
    displayValue: 'Monthly'
  },
  {
    value: 'year',
    displayValue: 'Yearly'
  }
];

function TemporaryStripeCheckoutTest() {
  const [stripe, setStripe] = useState();
  const params = useParams();

  const setOrgStripeAccountId = useCallback(async () => {
    const { data } = await axios.get(ORG_STRIPE_ACCOUNT_ID, {
      params: { revenue_program_slug: params.revProgramSlug }
    });
    const stripeAccount = data.stripe_account_id;
    setStripe(loadStripe('pk_test_31XWC5qhlLi9UkV1OzsI634W', { stripeAccount }));
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
  const [paymentMethodType, setPaymentMethodType] = useState('card');
  const [paymentInterval, setPaymentInterval] = useState('');
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
          amount,
          revenue_program_slug,
          donation_page_slug,
          email,
          given_name: givenName,
          family_name: familyName,
          reason
        };
        const { data } = await axios.post(STRIPE_PAYMENT, paymentIntentBody);
        resolve(data.clientSecret);
      } catch (e) {
        reject(e);
      }
    });
  }, [amount, email, givenName, familyName, reason, params]);

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

  const handleSinglePayment = () => {
    createPaymentIntent()
      .then(confirmOneTimePayment)
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

  const createPaymentMethod = async () => {
    return await stripe.createPaymentMethod({
      type: paymentMethodType,
      card: elements.getElement(CardElement),
      billing_details: {
        name: `${givenName} ${familyName}`
      }
    });
  };

  const handleRecurringPayment = async () => {
    const revenue_program_slug = params.revProgramSlug;
    const donation_page_slug = params.pageSlug;
    try {
      const paymentMethodResponse = await createPaymentMethod();
      if (paymentMethodResponse.error) {
        setErrors({ stripe: `Payment failed ${paymentMethodResponse.error.message}` });
        setProcessing(false);
        return;
      }
      const body = {
        payment_method_id: paymentMethodResponse.paymentMethod.id,
        interval: paymentInterval.value,
        amount,
        revenue_program_slug,
        donation_page_slug,
        email,
        given_name: givenName,
        family_name: familyName,
        reason
      };
      const response = await axios.post(STRIPE_PAYMENT, body, { timeout: 12000 });
      if (response.status === 200) {
        setErrors({});
        setProcessing(false);
        setSucceeded(true);
        handleSuccesfulPayment();
      }
    } catch (e) {
      if (e?.response?.data?.detail) {
        setErrors({ stripe: e.response.data.detail });
      } else {
        setErrors({ stripe: 'Payment failed' });
      }
      setProcessing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);

    if (paymentInterval.value === 'one-time') handleSinglePayment();
    else handleRecurringPayment();
  };

  return (
    <S.Wrapper>
      <S.FormStyled id="payment-form" onSubmit={handleSubmit} data-testid="donation-payment-form">
        <Select
          label="Payment type"
          onSelectedItemChange={({ selectedItem }) => setPaymentInterval(selectedItem)}
          selectedItem={paymentInterval}
          items={PAYMENT_INTERVALS}
          itemToString={(i) => i.value}
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
