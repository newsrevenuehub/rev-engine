import PropTypes, { InferProps } from 'prop-types';
import DElement from './DElement';
import { ICONS } from 'assets/icons/SvgIcon';
import StripePaymentWrapper from 'components/paymentProviders/stripe/StripePaymentWrapper';
import { NotLiveIcon, StyledNotLivePlaceholder } from './DPayment.styled';

export const DPaymentPropTypes = {
  live: PropTypes.bool
};

export type DPaymentProps = InferProps<typeof DPaymentPropTypes>;

function DPayment({ live }: DPaymentProps) {
  return <DElement>{live ? <StripePaymentWrapper /> : <NotLivePlaceholder />}</DElement>;
}

DPayment.propTypes = DPaymentPropTypes;
DPayment.type = 'DPayment';
DPayment.displayName = 'Payment Fees';
DPayment.description = 'Handle payment processing fees';
DPayment.required = true;
DPayment.unique = true;
DPayment.requireContent = true;
DPayment.contentMissingMsg = `${DPayment.displayName} needs to have at least one payment method configured.`;

export default DPayment;

function NotLivePlaceholder() {
  return (
    <StyledNotLivePlaceholder>
      [Placeholder] Contributions <NotLiveIcon icon={ICONS.STRIPE_POWERED} />
    </StyledNotLivePlaceholder>
  );
}
