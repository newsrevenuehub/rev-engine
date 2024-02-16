import { useElements, useStripe } from '@stripe/react-stripe-js';
import { PaymentMethod as StripePaymentMethod } from '@stripe/stripe-js';
import PropTypes, { InferProps } from 'prop-types';
import { useState } from 'react';
import { formattedCardBrands } from 'constants/creditCard';
import { PortalContributionDetail } from 'hooks/usePortalContribution';
import { DetailSection } from '../DetailSection';
import { Columns, Detail, SectionControlButton, SectionEditButton, Subheading } from '../common.styled';
import { EditControls, LastCardDigits } from './PaymentMethod.styled';
import StripeCardForm from './StripeCardForm';
import { useSnackbar } from 'notistack';
import SystemNotification from 'components/common/SystemNotification';

const PaymentMethodPropTypes = {
  contribution: PropTypes.object.isRequired,
  disabled: PropTypes.bool,
  editable: PropTypes.bool,
  onEdit: PropTypes.func.isRequired,
  onEditComplete: PropTypes.func.isRequired,
  onUpdatePaymentMethod: PropTypes.func.isRequired
};

export interface PaymentMethodProps extends InferProps<typeof PaymentMethodPropTypes> {
  contribution: PortalContributionDetail;
  onUpdatePaymentMethod: (method: StripePaymentMethod) => void;
}

export function PaymentMethod({
  contribution,
  disabled,
  editable,
  onEdit,
  onEditComplete,
  onUpdatePaymentMethod
}: PaymentMethodProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [cardOwnerName, setCardOwnerName] = useState(contribution.card_owner_name);
  const [cardComplete, setCardComplete] = useState(false);
  const elements = useElements();
  const stripe = useStripe();

  async function handleSave() {
    if (!stripe) {
      // Should never happen: <ContributionDetail> creates this for us.
      // It needs to be in a parent component so we can use useStripe().

      throw new Error('Stripe not initialized');
    }

    const card = elements?.getElement('card');

    if (!card) {
      // Should never happen: should be created in <StripeCardForm>.

      throw new Error('No card element present to update payment method with');
    }

    const { error, paymentMethod } = await stripe.createPaymentMethod({
      card,
      billing_details: { name: cardOwnerName },
      type: 'card'
    });

    if (error) {
      // Log the exact error to Sentry.
      console.error(error.message);

      enqueueSnackbar('A problem occurred while updating your payment method. Please try again.', {
        persist: true,
        content: (key: string, message: string) => (
          <SystemNotification id={key} message={message} header="Failed to Update Payment Method" type="error" />
        )
      });
      return;
    }

    onUpdatePaymentMethod(paymentMethod);
    onEditComplete();
  }

  const controls = editable ? (
    <EditControls>
      <SectionEditButton color="text" onClick={onEditComplete}>
        Cancel
      </SectionEditButton>
      <SectionEditButton
        color="primaryDark"
        disabled={!cardComplete || cardOwnerName.trim() === ''}
        onClick={handleSave}
      >
        Save
      </SectionEditButton>
    </EditControls>
  ) : (
    contribution.is_modifiable && (
      <SectionControlButton disabled={!!disabled} onClick={onEdit}>
        Change payment method
      </SectionControlButton>
    )
  );

  return (
    <DetailSection controls={controls} disabled={disabled} highlighted={editable} title="Payment Method">
      {editable ? (
        <StripeCardForm name={cardOwnerName} onChangeCardComplete={setCardComplete} onChangeName={setCardOwnerName} />
      ) : (
        <Columns>
          <div>
            <Subheading>Name on Card</Subheading>
            <Detail data-testid="cc_owner_name">{contribution.card_owner_name}</Detail>
          </div>
          <div></div>
          <div>
            <Subheading>Credit Card</Subheading>
            <Detail>
              <span data-testid="card_brand">{formattedCardBrands[contribution.card_brand]}</span>{' '}
              <LastCardDigits data-testid="last4">{contribution.card_last_4}</LastCardDigits>
            </Detail>
          </div>
          <div>
            <Subheading>Expiration</Subheading>
            <Detail data-testid="expiration">{contribution.card_expiration_date}</Detail>
          </div>
        </Columns>
      )}
    </DetailSection>
  );
}

PaymentMethod.propTypes = PaymentMethodPropTypes;
export default PaymentMethod;
