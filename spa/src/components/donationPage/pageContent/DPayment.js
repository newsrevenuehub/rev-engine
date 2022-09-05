import { useState } from 'react';
import PropTypes from 'prop-types';
import * as S from './DPayment.styled';
import DElement from './DElement';
import { ICONS } from 'assets/icons/SvgIcon';

// Util
import formatStringAmountForDisplay from 'utilities/formatStringAmountForDisplay';
import { getFrequencyAdverb } from 'utilities/parseFrequency';
import calculateStripeFee from 'utilities/calculateStripeFee';

// Context
import { usePage } from '../DonationPage';

// Stripe
import StripePaymentWrapper from 'components/paymentProviders/stripe/StripePaymentWrapper';

function DPayment({ live: liveMode, payFeesDefaultChecked }) {
  const [totalAmount, setTotalAmount] = useState();

  // used to be in element.content?.offerPayFees
  const displayOfferPayFees = true;
  return (
    <DElement>
      {liveMode ? <StripePaymentWrapper offerPayFees={displayOfferPayFees} /> : <NotLivePlaceholder />}
    </DElement>
  );
}

DPayment.propTypes = {
  liveMode: PropTypes.bool.isRequired,
  paymentIntentSecret: PropTypes.string
};

DPayment.defaultProps = {
  liveMode: false
};

DPayment.type = 'DPayment';
DPayment.displayName = 'Payment';
DPayment.description = 'Allow donors to contribute';
DPayment.required = true;
DPayment.unique = true;
DPayment.requireContent = true;
DPayment.contentMissingMsg = `${DPayment.displayName} needs to have at least one payment method configured.`;

export default DPayment;

function NotLivePlaceholder() {
  return (
    <S.NotLivePlaceholder>
      [Placeholder] Contributions <S.NotLiveIcon icon={ICONS.STRIPE_POWERED} />
    </S.NotLivePlaceholder>
  );
}

export function PayFeesWidget() {
  const { page, frequency, amount, payFee, setPayFee } = usePage();

  const currencySymbol = page?.currency?.symbol;

  return (
    <S.PayFees data-testid="pay-fees">
      <S.PayFeesQQ>Agree to pay fees?</S.PayFeesQQ>
      <S.Checkbox
        label={
          amount
            ? `${currencySymbol}${formatStringAmountForDisplay(
                calculateStripeFee(amount, frequency, page.revenue_program_is_nonprofit)
              )} ${getFrequencyAdverb(frequency)}`
            : ''
        }
        toggle
        checked={payFee}
        onChange={(_e, { checked }) => setPayFee(checked)}
        data-testid={`pay-fees-${payFee ? 'checked' : 'not-checked'}`}
      />
      <S.PayFeesDescription>
        Paying the Stripe transaction fee, while not required, directs more money in support of our mission.
      </S.PayFeesDescription>
    </S.PayFees>
  );
}
