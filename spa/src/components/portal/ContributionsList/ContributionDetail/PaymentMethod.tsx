import PropTypes, { InferProps } from 'prop-types';
import { formattedCardBrands } from 'constants/creditCard';
import { PortalContributionDetail } from 'hooks/usePortalContribution';
import { EditButton, LastCardDigits } from './PaymentMethod.styled';
import { Columns, Detail, Heading, Subheading } from './common.styled';
import { useEffect, useState } from 'react';

const PaymentMethodPropTypes = {
  contribution: PropTypes.object.isRequired,
  editable: PropTypes.bool.isRequired
};

export interface PaymentMethodProps extends InferProps<typeof PaymentMethodPropTypes> {
  contribution: PortalContributionDetail;
}

// This will eventually have an editable state.

export function PaymentMethod({ contribution, editable }: PaymentMethodProps) {
  const [stripeFormVisible, setStripeFormVisible] = useState(editable);

  useEffect(() => {
    if (!editable) {
      setStripeFormVisible(false);
    }
  }, [editable]);

  return (
    <>
      <Heading>Payment Method</Heading>
      {stripeFormVisible ? (
        <p>Stripe form would be here</p>
      ) : (
        <Columns>
          <div>
            <Subheading>Name on Card</Subheading>
            <Detail data-testid="cc_owner_name">{contribution.credit_card_owner_name}</Detail>
          </div>
          <div></div>
          <div>
            <Subheading>Credit Card</Subheading>
            <Detail>
              <span data-testid="card_brand">{formattedCardBrands[contribution.card_brand]}</span>{' '}
              <LastCardDigits data-testid="last4">{contribution.last4}</LastCardDigits>
            </Detail>
          </div>
          <div>
            <Subheading>Expiration</Subheading>
            <Detail data-testid="expiration">{contribution.credit_card_expiration_date}</Detail>
          </div>
        </Columns>
      )}
      {editable && (
        <EditButton disabled={stripeFormVisible} onClick={() => setStripeFormVisible(true)}>
          Update payment method
        </EditButton>
      )}
    </>
  );
}

PaymentMethod.propTypes = PaymentMethodPropTypes;
export default PaymentMethod;
