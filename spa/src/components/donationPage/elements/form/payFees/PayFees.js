import * as S from './PayFees.styled';

// Util
import formatStringAmountForDisplay from 'utilities/formatStringAmountForDisplay';
import { getFrequencyAdverb } from 'utilities/parseFrequency';
import calculateStripeFee from 'utilities/calculateStripeFee';

// Context
import { usePage } from '../../../DonationPage';

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
