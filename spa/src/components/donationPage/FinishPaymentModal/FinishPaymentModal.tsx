import { ChevronLeft } from '@material-ui/icons';
import PropTypes, { InferProps } from 'prop-types';
import { Provider as AlertProvider } from 'react-alert';
import { Modal } from 'components/base';
import { StripePaymentWrapper } from 'components/paymentProviders/stripe';
import Alert, { alertOptions } from 'elements/alert/Alert';
import { Payment } from 'hooks/usePayment';
import ContributionDisclaimer from './ContributionDisclaimer';
import StripePaymentForm from './StripePaymentForm';
import { BackButton, Root } from './FinishPaymentModal.styled';

const FinishPaymentModalPropTypes = {
  onCancel: PropTypes.func.isRequired,
  onError: PropTypes.func,
  open: PropTypes.bool,
  payment: PropTypes.object.isRequired
};

export interface FinishPaymentModalProps extends InferProps<typeof FinishPaymentModalPropTypes> {
  onCancel: () => void;
  onError: (error: Error) => void;
  payment: Payment;
}

/**
 * This modal shows a Stripe Payment element that allows the user to complete
 * their contribution. When they do that, they will be redirected to the
 * appropriate thank you page.
 * @see https://stripe.com/docs/payments/payment-element
 */
export function FinishPaymentModal({ onCancel, onError, open, payment }: FinishPaymentModalProps) {
  return (
    <Modal open={open!}>
      <AlertProvider template={Alert} {...alertOptions}>
        <StripePaymentWrapper
          onError={onError}
          stripeClientSecret={payment.stripe.clientSecret}
          stripeAccountId={payment.stripe.accountId}
        >
          <Root>
            <BackButton onClick={onCancel}>
              <ChevronLeft />
              Back
            </BackButton>
            <StripePaymentForm payment={payment} />
            <ContributionDisclaimer
              formattedAmount={`${payment.currency.symbol}${payment.amount} ${payment.currency.code}`}
              interval={payment.interval}
            />
          </Root>
        </StripePaymentWrapper>
      </AlertProvider>
    </Modal>
  );
}

FinishPaymentModal.propTypes = FinishPaymentModalPropTypes;
export default FinishPaymentModal;
