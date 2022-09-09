import * as S from './DPayment.styled';
import DElement from './DElement';
import { ICONS } from 'assets/icons/SvgIcon';

// Util
import formatStringAmountForDisplay from 'utilities/formatStringAmountForDisplay';
import { getFrequencyAdverb } from 'utilities/parseFrequency';

// Context
import { usePage } from '../DonationPage';

// Stripe
import StripePaymentWrapper from 'components/paymentProviders/stripe/StripePaymentWrapper';

function DPayment({ live: liveMode }) {
  return <DElement>{liveMode ? <StripePaymentWrapper /> : <NotLivePlaceholder />}</DElement>;
}

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
  const { page, frequency, userAgreesToPayFees, setUserAgreesToPayFees, feeAmount } = usePage();
  const currencySymbol = page?.currency?.symbol;

  return (
    <S.PayFees data-testid="pay-fees">
      <S.PayFeesQQ>Agree to pay fees?</S.PayFeesQQ>
      <S.Checkbox
        label={
          feeAmount
            ? `${currencySymbol}${formatStringAmountForDisplay(feeAmount)} ${getFrequencyAdverb(frequency)}`
            : ''
        }
        toggle
        checked={userAgreesToPayFees}
        onChange={(_e, { checked }) => setUserAgreesToPayFees(checked)}
        data-testid={`pay-fees-${userAgreesToPayFees ? 'checked' : 'not-checked'}`}
      />
      <S.PayFeesDescription>
        Paying the Stripe transaction fee, while not required, directs more money in support of our mission.
      </S.PayFeesDescription>
    </S.PayFees>
  );
}
