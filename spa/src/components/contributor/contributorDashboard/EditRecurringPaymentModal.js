import { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  CardElementStyle,
  CardElementWrapper,
  CardFormRoot,
  CompletedMessage,
  CurrentDatum,
  CurrentList,
  Datum,
  Description,
  ModalRoot,
  PaymentError
} from './EditRecurringPaymentModal.styled';

// Ajax
import axios, { AuthenticationError } from 'ajax/axios';
import { SUBSCRIPTIONS } from 'ajax/endpoints';

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

import { HUB_STRIPE_API_PUB_KEY } from 'appSettings';

// Children
import Modal from 'elements/modal/Modal';
import Button from 'elements/buttons/Button';
import GlobalLoading from 'elements/GlobalLoading';
import ContributionPaymentMethod from './ContributionPaymentMethod';

function EditRecurringPaymentModal({ isOpen, closeModal, contribution, onComplete }) {
  const stripe = useRef(loadStripe(HUB_STRIPE_API_PUB_KEY, { stripeAccount: contribution.stripe_account_id }));
  const [showCompletedMessage, setShowCompletedMessage] = useState(false);

  const handleNewPaymentMethod = async (paymentMethod, onCompleteCallback) => {
    await axios.patch(`${SUBSCRIPTIONS}${contribution.subscription_id}/`, {
      payment_method_id: paymentMethod.id,
      revenue_program_slug: contribution.revenue_program
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
      <ModalRoot data-testid="edit-recurring-payment-modal">
        {showCompletedMessage ? (
          <CompletedMessage data-testid="edit-recurring-payment-modal-success">
            <p>
              Your new payment method will be used for the next payment. Changes may not appear in our system right
              away.
            </p>
            <Button onClick={onCompleteOk} type="positive">
              Ok
            </Button>
          </CompletedMessage>
        ) : (
          <>
            <h2>Update recurring contribution</h2>
            <CurrentList>
              <CurrentDatum>
                <span>Amount:</span>
                <Datum>{formatCurrencyAmount(contribution.amount)}</Datum>
              </CurrentDatum>
              <CurrentDatum>
                <span>Interval:</span> <Datum>{getFrequencyAdjective(contribution.interval)}</Datum>
              </CurrentDatum>
              <CurrentDatum>
                <span>Payment method:</span> <ContributionPaymentMethod contribution={contribution} disabled />
              </CurrentDatum>
            </CurrentList>
            {stripe && stripe.current && (
              <Elements stripe={stripe.current}>
                <CardForm onPaymentMethod={handleNewPaymentMethod} closeModal={closeModal} />
              </Elements>
            )}
          </>
        )}
      </ModalRoot>
    </Modal>
  );
}

EditRecurringPaymentModal.propTypes = {
  /**
   * Contribution whose payment we're updating.
   * (this type obviously could be better)
   */
  contribution: PropTypes.object.isRequired,
  /**
   * Called when the modal is closed, either by the user successfully updating
   * their payment method or cancelling out.
   */
  closeModal: PropTypes.func.isRequired,
  /**
   * Is the modal currently visible?
   */
  isOpen: PropTypes.bool.isRequired,
  /**
   * Called when the payment is successfully updated. `closeModal` is also called.
   */
  onComplete: PropTypes.func.isRequired
};

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
    setDisabled(event.error || !event.complete);
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
      <CardFormRoot>
        <Description>Update your payment method</Description>

        <CardElementWrapper>
          <CardElement id="card-element" options={{ style: CardElementStyle(theme) }} onChange={handleChange} />
        </CardElementWrapper>

        <Button
          onClick={handleUpdatePaymentMethod}
          type="positive"
          loading={loading}
          disabled={loading || disabled || succeeded}
          data-testid="contrib-update-payment-method-btn"
        >
          Update payment method
        </Button>
        {errors.stripe && (
          <PaymentError role="alert" data-testid="donation-error">
            {errors.stripe}
          </PaymentError>
        )}
      </CardFormRoot>
      {loading && <GlobalLoading />}
    </>
  );
}

CardForm.propTypes = {
  /**
   * Called when the form thinks the parent modal should be closed, right now
   * because it's detected the user's session has expired.
   */
  closeModal: PropTypes.func.isRequired,
  /**
   * Called when the user has submitted the form and a new payment method is
   * created in Stripe. The payment method is passed.
   */
  onPaymentMethod: PropTypes.func.isRequired
};
