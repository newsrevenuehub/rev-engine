import PropTypes from 'prop-types';
import React, { useState } from 'react';
import { PaymentElement } from '@stripe/react-stripe-js';

import PayFees from './payFees/PayFees';

function Form({
  wallets,
  loading,
  isLive,
  onSubmit,
  formLevelMessage,
  dynamicElements,
  submitButtonText,
  disabled,
  stripePaymentElementId
}) {
  const [paymentElementComplete, setPaymentElementComplete] = useState(false);

  return (
    <form onSubmit={onSubmit}>
      {/* these are all expected to use `useFormContext` in order to hook into RHF as required. */}
      {/* they are configured to register with default names, which are expected in calling context */}
      {/* of this component */}
      {dynamicElements.map(({ element: Element, ...rest }, idx) => {
        return <Element key={`donation-page-dynamic-form-element-${idx}`} {...rest} />;
      })}
      {/* This element can update watched global amount */}
      <PayFees />
      {/* This relies on parent context wrapping `<Form>` with Stripe.js's <Elements/>*/}
      <PaymentElement
        id={stripePaymentElementId}
        className=""
        // this configures element such that customer email, address, name, and similar
        // must be gathered elsewhere in our form and submitted when creating a payment method
        billingDetails="never"
        onChange={({ complete }) => setPaymentElementComplete(complete)}
        options={{ wallets }}
      />
      <button disabled={disabled || !isLive || !paymentElementComplete} type="submit">
        {loading ? <div className="spinner" id="spinner"></div> : <span>{submitButtonText}</span>}
      </button>
      {formLevelMessage && <div id="form-level-message">{formLevelMessage}</div>}
    </form>
  );
}

Form.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  formLevelMessage: PropTypes.string,
  dynamicElements: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  submitButtonText: PropTypes.string.isRequired,
  disabled: PropTypes.bool.isRequired,
  loading: PropTypes.bool.isRequired,
  isLive: PropTypes.bool.isRequired,
  stripePaymentElementId: PropTypes.string.isRequired,
  wallets: PropTypes.shape({
    appleyPay: PropTypes.oneOf('auto', 'never'),
    googlePay: PropTypes.oneOf('auto', 'never')
  })
};

Form.defaultProps = {
  disabled: false,
  loading: false,
  isLive: false,
  stripePaymentElementId: 'stripe-payment-element',
  wallets: {
    appleyPay: 'auto',
    googlePay: 'auto'
  }
};
export default Form;
