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
import { useTranslation } from 'react-i18next';
import { StripeElementLocale } from '@stripe/stripe-js';

const FinishPaymentModalPropTypes = {
  onCancel: PropTypes.func.isRequired,
  onError: PropTypes.func,
  open: PropTypes.bool.isRequired,
  payment: PropTypes.object.isRequired
};

export interface FinishPaymentModalProps extends InferProps<typeof FinishPaymentModalPropTypes> {
  onCancel: () => void;
  onError: (error: Error) => void;
  payment: Payment;
  locale: StripeElementLocale;
}

/**
 * This modal shows a Stripe Payment element that allows the user to complete
 * their contribution. When they do that, they will be redirected to the
 * appropriate thank you page.
 * @see https://stripe.com/docs/payments/payment-element
 */
export function FinishPaymentModal({ onCancel, onError, open, payment, locale }: FinishPaymentModalProps) {
  const { t } = useTranslation();

  return (
    <StripePaymentWrapper
      onError={onError}
      stripeClientSecret={payment.stripe.clientSecret}
      stripeAccountId={payment.stripe.accountId}
      stripeLocale={locale}
    >
      <Modal open={open}>
        <AlertProvider template={Alert} {...alertOptions}>
          <Root>
            <BackButton onClick={onCancel}>
              <ChevronLeft />
              {t('common.actions.back')}
            </BackButton>
            <StripePaymentForm payment={payment} locale={locale} />
            <ContributionDisclaimer
              formattedAmount={`${payment.currency.symbol}${payment.amount} ${payment.currency.code}`}
              interval={payment.interval}
              processingDate={new Date()}
            />
          </Root>
        </AlertProvider>
      </Modal>
    </StripePaymentWrapper>
  );
}

FinishPaymentModal.propTypes = FinishPaymentModalPropTypes;
export default FinishPaymentModal;
