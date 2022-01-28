import { useMemo } from 'react';
import * as S from './DonationPageDisclaimer.styled';
import { format } from 'date-fns';

import { getTotalAmount } from 'components/paymentProviders/stripe/stripeFns';

function DonationPageDisclaimer({ page, amount, payFee, frequency }) {
  const getFreqText = () =>
    frequency === 'one_time' ? (
      ''
    ) : (
      <span>
        , <strong>along with all future recurring payments</strong>
      </span>
    );

  const getAmountText = () => {
    if (frequency === 'one_time') return format(new Date(), 'MMM do, y');
    if (frequency === 'month') return `the ${format(new Date(), 'do')} of the month until you cancel`;
    if (frequency === 'year') return `${format(new Date(), 'L/d')} yearly until you cancel`;
  };

  const totalAmount = useMemo(
    () =>
      `${page.currency?.symbol}${getTotalAmount(amount, payFee, frequency, page.organization_is_nonprofit)}${
        frequency === 'one_time' ? '' : ','
      }`,
    [amount, payFee, frequency, page.organization_is_nonprofit, page.currency.symbol]
  );

  return (
    <S.DonationPageDisclaimer data-testid="donation-page-static-text">
      <p>
        By proceeding with this transaction, you agree to our{' '}
        <strong>
          <a href="https://fundjournalism.org/faq/privacy-policy/" target="blank" rel="noopener noreferrer">
            privacy policy
          </a>
        </strong>{' '}
        and{' '}
        <strong>
          <a href="https://fundjournalism.org/faq/terms-of-service/" target="blank" rel="noopener noreferrer">
            terms & conditions
          </a>
        </strong>
        . Additionally, by proceeding with this transaction, you're authorizing today's payment{getFreqText()} of{' '}
        <strong>
          {totalAmount} to be processed on or adjacent to {getAmountText()}.
        </strong>
      </p>
    </S.DonationPageDisclaimer>
  );
}

export default DonationPageDisclaimer;
