import * as S from './DonationPageDisclaimer.styled';
import { format } from 'date-fns';
// needs to be relative import otherwise aliasing not work in jest tests
import { CONTRIBUTION_INTERVALS } from '../../constants/contributionIntervals';

function DonationPageDisclaimer({ page, amount, frequency }) {
  const getFreqText = () =>
    frequency === CONTRIBUTION_INTERVALS.ONE_TIME ? (
      ''
    ) : (
      <span>
        , <strong>along with all future recurring payments</strong>
      </span>
    );

  const getAmountText = () => {
    if (frequency === CONTRIBUTION_INTERVALS.ONE_TIME) return format(new Date(), 'MMM do, y');
    if (frequency === CONTRIBUTION_INTERVALS.MONTHLY)
      return `the ${format(new Date(), 'do')} of the month until you cancel`;
    if (frequency === CONTRIBUTION_INTERVALS.ANNUAL) return `${format(new Date(), 'L/d')} yearly until you cancel`;
  };

  const amountString = `${page.currency?.symbol}${amount} ${page.currency?.code}${
    frequency === CONTRIBUTION_INTERVALS.ONE_TIME ? '' : ','
  }`;

  return (
    <S.DonationPageDisclaimer data-testid="donation-page-disclaimer">
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
          {amountString} to be processed on or adjacent to {getAmountText()}.
        </strong>
      </p>
    </S.DonationPageDisclaimer>
  );
}

export default DonationPageDisclaimer;
