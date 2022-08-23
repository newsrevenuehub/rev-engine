import PropTypes from 'prop-types';
import React, { useState } from 'react';
import { PaymentElement } from '@stripe/react-stripe-js';

import PayFees from './payFees/PayFees';

function Form({
  wallets,
  loading,
  liveView,
  onSubmit,
  formLevelMessage,
  children,
  submitButtonText,
  disabled,
  stripePaymentElementId,
  payFeesLabelText
}) {
  const [paymentElementComplete, setPaymentElementComplete] = useState(false);
  return (
    <form onSubmit={onSubmit}>
      {/* fieldsets, inputs, etc. */}
      {children}
      <PayFees payFeesLabelText={payFeesLabelText} />
      {/* This relies on parent context wrapping `<Form>` with Stripe.js's <Elements/>*/}
      {liveView ? (
        <PaymentElement
          id={stripePaymentElementId}
          // this configures element such that customer email, address, name, and similar
          // must be gathered elsewhere in our form and submitted when creating a payment method
          options={{
            fields: {
              billingDetails: 'never'
            },
            terms: { card: 'never' }
          }}
          onChange={({ complete }) => setPaymentElementComplete(complete)}
        />
      ) : (
        <div className="border-2 p-3 text-center italic mb-6 border-gray-400">
          Stripe Payment Element Here in live page view
        </div>
      )}
      <button
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        disabled={disabled || (liveView && !paymentElementComplete)}
        type="submit"
      >
        {loading ? <div className="spinner" id="spinner"></div> : <span>{submitButtonText}</span>}
      </button>
      {formLevelMessage && <div id="form-level-message">{formLevelMessage}</div>}
    </form>
  );
}

Form.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  formLevelMessage: PropTypes.string,
  submitButtonText: PropTypes.string.isRequired,
  disabled: PropTypes.bool.isRequired,
  loading: PropTypes.bool.isRequired,
  liveView: PropTypes.bool.isRequired,
  stripePaymentElementId: PropTypes.string.isRequired,
  children: PropTypes.arrayOf(PropTypes.node).isRequired,
  payFeesLabelText: PropTypes.string.isRequired
};

Form.defaultProps = {
  disabled: false,
  loading: false,
  liveView: false,
  stripePaymentElementId: 'stripe-payment-element'
};
export default Form;
