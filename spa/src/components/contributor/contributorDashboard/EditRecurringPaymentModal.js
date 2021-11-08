import { useState, useRef } from 'react';
import * as S from './EditRecurringPaymentModal.styled';
import { CardElementStyle, PaymentError } from 'components/paymentProviders/stripe/StripePaymentForm.styled';

// Ajax
import axios, { AuthenticationError } from 'ajax/axios';
import { CONTRIBUTIONS, UPDATE_PAYMENT_METHOD } from 'ajax/endpoints';

// Constant
import { GENERIC_ERROR } from 'constants/textConstants';

// Context
import { useContributorDashboardContext } from 'components/contributor/contributorDashboard/ContributorDashboard';

// Utils
import { getFrequencyAdjective } from 'utilities/parseFrequency';
import formatCurrencyAmount from 'utilities/formatCurrencyAmount';

// Deps
import { useTheme } from 'styled-components';
import { useAlert } from 'react-alert';

// Stripe
import { loadStripe } from '@stripe/stripe-js';
import { CardElement, Elements, useStripe, useElements } from '@stripe/react-stripe-js';
import { createPaymentMethod } from 'components/paymentProviders/stripe/stripeFns';

import { HUB_STRIPE_PUBLISHABLE_KEY } from '../settings';

// Children
import Modal from 'elements/modal/Modal';
import { PaymentMethodCell } from 'components/contributor/contributorDashboard/ContributorDashboard';
import Button from 'elements/buttons/Button';
import GlobalLoading from 'elements/GlobalLoading';

function EditRecurringPaymentModal({ isOpen, closeModal, contribution, onComplete }) {
  const stripe = useRef(loadStripe(HUB_STRIPE_PUBLISHABLE_KEY, { stripeAccount: contribution.org_stripe_id }));
  const [showCompletedMessage, setShowCompletedMessage] = useState(false);

  const handleNewPaymentMethod = async (paymentMethod, onCompleteCallback) => {
    await axios.patch(`${CONTRIBUTIONS}${contribution.id}/${UPDATE_PAYMENT_METHOD}`, {
      payment_method_id: paymentMethod.id
    });
    onCompleteCallback();
    setShowCompletedMessage(true);
  };

  const onCompleteOk = () => {
    onComplete();
    closeModal();
  };

  return (
    <Modal isOpen={isOpen} closeModal={closeModal}>
      <S.EditRecurringPaymentModal data-testid="edit-recurring-payment-modal">
        {showCompletedMessage ? (
          <S.CompletedMessage>
            <p>
              Your new payment method will be used for the next payment. Changes may not appear in our system right
              away.
            </p>
            <Button onClick={onCompleteOk} type="positive">
              Ok
            </Button>
          </S.CompletedMessage>
        ) : (
          <>
            <h2>Update recurring contribution</h2>
            <S.CurrentList>
              <S.CurrentDatum>
                <span>Amount:</span>
                <S.Datum>{formatCurrencyAmount(contribution.amount)}</S.Datum>
              </S.CurrentDatum>
              <S.CurrentDatum>
                <span>Interval:</span> <S.Datum>{getFrequencyAdjective(contribution.interval)}</S.Datum>
              </S.CurrentDatum>
              <S.CurrentDatum>
                <span>Payment method:</span> <PaymentMethodCell contribution={contribution} />
              </S.CurrentDatum>
            </S.CurrentList>
            {stripe && stripe.current && (
              <Elements stripe={stripe.current}>
                <CardForm onPaymentMethod={handleNewPaymentMethod} closeModal={closeModal} />
              </Elements>
            )}
          </>
        )}
      </S.EditRecurringPaymentModal>
    </Modal>
  );
}

export default EditRecurringPaymentModal;

function CardForm({ onPaymentMethod, closeModal }) {
  const alert = useAlert();
  const theme = useTheme();
  const stripe = useStripe();
  const elements = useElements();
  const { setTokenExpired } = useContributorDashboardContext();
  const [loading, setLoading] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const [disabled, setDisabled] = useState(true);
  const [errors, setErrors] = useState({});

  /**
   * Listen for changes in the CardElement and display any errors as the customer types their card details
   */
  const handleChange = async (event) => {
    setDisabled(event.empty);
    setErrors({ stripe: event.error ? event.error.message : '' });
  };

  const handleUpdatePaymentMethod = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await createPaymentMethod(stripe, elements.getElement(CardElement));
      if (response.error) {
        setErrors({ stripe: response.error ? response.error.message : '' });
      } else {
        await onPaymentMethod(response.paymentMethod, () => {
          setSucceeded(true);
          setErrors({});
          setLoading(false);
        });
      }
    } catch (e) {
      if (e instanceof AuthenticationError) {
        closeModal();
        setTokenExpired(true);
        return;
      }
      alert.error(GENERIC_ERROR);
      setLoading(false);
    }
  };

  return (
    <>
      <S.CardForm>
        <S.Description>Update your payment method</S.Description>

        <S.CardElementWrapper>
          <CardElement id="card-element" options={{ style: CardElementStyle(theme) }} onChange={handleChange} />
        </S.CardElementWrapper>

        <Button
          onClick={handleUpdatePaymentMethod}
          type="positive"
          loading={loading}
          disabled={loading || disabled || succeeded}
        >
          Update payment method
        </Button>
        {errors.stripe && (
          <PaymentError role="alert" data-testid="donation-error">
            {errors.stripe}
          </PaymentError>
        )}
      </S.CardForm>
      {loading && <GlobalLoading />}
    </>
  );
}
