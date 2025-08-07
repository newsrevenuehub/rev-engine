import { StripeElementLocale } from '@stripe/stripe-js';
import PropTypes, { InferProps } from 'prop-types';
import { useEffect, useState } from 'react';
import { Payment } from 'hooks/usePayment';
import StripeForm from './StripeForm';
import StripeLoader from './StripeLoader';

const StripeModalPropTypes = {
  locale: PropTypes.string.isRequired,
  onError: PropTypes.func,
  payment: PropTypes.object.isRequired
};

export interface StripeModalProps extends InferProps<typeof StripeModalPropTypes> {
  locale: StripeElementLocale;
  onError?: (error: Error) => void;
  payment: Payment;
}

export function StripeModal({ locale, onError, payment }: StripeModalProps) {
  const [dialogEl, setDialogEl] = useState<HTMLDialogElement | null>();

  useEffect(() => {
    if (dialogEl) {
      dialogEl.showModal();
    }
  }, [dialogEl]);

  return (
    <StripeLoader
      onError={onError}
      stripeClientSecret={payment.stripe.clientSecret}
      stripeAccountId={payment.stripe.accountId}
      stripeLocale={locale}
    >
      <dialog ref={setDialogEl}>
        <StripeForm payment={payment} />
      </dialog>
    </StripeLoader>
  );
}

StripeModal.propTypes = StripeModalPropTypes;
export default StripeModal;
