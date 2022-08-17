import PropTypes from 'prop-types';
import { Elements, PaymentElement } from '@stripe/react-stripe-js';

function StripeIntegration({ clientSecret, stripePromise, errors }) {
  const options = {
    // clientSecret
  };

  return (
    <div>
      {clientSecret && (
        <Elements options={options} stripe={stripePromise}>
          <PaymentElement id="payment-element" />
        </Elements>
      )}
      {/* errors here */}
    </div>
  );
}

StripeIntegration.propTypes = {
  clientSecret: PropTypes.string,
  stripePromise: PropTypes.instanceOf(Promise)
};

export default StripeIntegration;
