import * as S from "./TemporaryStripeCheckoutTest.styled";

// For Parent of checkout form
import { Elements } from "@stripe/react-stripe-js";

// For Checkout Form
import { useState, useEffect } from "react";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import axios from "ajax/axios";
import { STRIPE_PAYMENT_INTENT } from "ajax/endpoints";

function TemporaryStripeCheckoutTest({ stripe }) {
  console.log("stripe", stripe);
  return (
    <S.TemporaryStripeCheckoutTest>
      {stripe && (
        <Elements stripe={stripe}>
          <CheckoutForm />
        </Elements>
      )}
    </S.TemporaryStripeCheckoutTest>
  );
}

export default TemporaryStripeCheckoutTest;

function CheckoutForm() {
  const [succeeded, setSucceeded] = useState(false);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState("");
  const [disabled, setDisabled] = useState(true);
  const [clientSecret, setClientSecret] = useState("");

  const stripe = useStripe();
  const elements = useElements();

  useEffect(() => {
    // Create PaymentIntent as soon as the page loads
    async function createPaymentIntent() {
      const orgSlug = "michaels-org"; // get me from url!
      try {
        const paymentIntentBody = {
          payment_amount: "20.00",
          payment_frequency: "single",
          org_slug: orgSlug,
        };
        const { data } = await axios.post(
          STRIPE_PAYMENT_INTENT,
          paymentIntentBody
        );
        setClientSecret(data.clientSecret);
      } catch (e) {
        debugger;
        console.log(e.response);
      }
    }
    createPaymentIntent();
  }, []);

  const handleChange = async (event) => {
    // Listen for changes in the CardElement
    // and display any errors as the customer types their card details
    setDisabled(event.empty);
    setError(event.error ? event.error.message : "");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    const payload = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: elements.getElement(CardElement),
      },
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
    <form id="payment-form" onSubmit={handleSubmit}>
      <CardElement
        id="card-element"
        options={cardStyle}
        onChange={handleChange}
      />
      <button disabled={processing || disabled || succeeded} id="submit">
        <span id="button-text">
          {processing ? (
            <div className="spinner" id="spinner"></div>
          ) : (
            "Pay now"
          )}
        </span>
      </button>
      {/* Show any error that happens when processing the payment */}
      {error && (
        <div className="card-error" role="alert">
          {error}
        </div>
      )}
      {/* Show a success message upon completion */}
      {succeeded && (
        <p className={succeeded ? "result-message" : "result-message hidden"}>
          Payment succeeded, see the result in your
          <a href={`https://dashboard.stripe.com/test/payments`}>
            {" "}
            Stripe dashboard.
          </a>{" "}
          Refresh the page to pay again.
        </p>
      )}
    </form>
  );
}

const cardStyle = {
  style: {
    base: {
      color: "#32325d",
      fontFamily: "Arial, sans-serif",
      fontSmoothing: "antialiased",
      fontSize: "16px",
      "::placeholder": {
        color: "#32325d",
      },
    },
    invalid: {
      color: "#fa755a",
      iconColor: "#fa755a",
    },
  },
};
