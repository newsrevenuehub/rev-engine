import PropTypes, { InferProps } from 'prop-types';
import { format } from 'date-fns';
import { useMemo } from 'react';
import { CONTRIBUTION_INTERVALS, ContributionInterval } from 'constants/contributionIntervals';
import { PRIVACY_POLICY_URL, TS_AND_CS_URL } from 'constants/helperUrls';
import { Link, Root } from './ContributionDisclaimer.styled';

const ContributionDisclaimerPropTypes = {
  formattedAmount: PropTypes.string.isRequired,
  interval: PropTypes.string.isRequired
};

export interface ContributionDisclaimerProps extends InferProps<typeof ContributionDisclaimerPropTypes> {
  interval: ContributionInterval;
}

function ContributionDisclaimer({ formattedAmount, interval }: ContributionDisclaimerProps) {
  const frequencySuffix = useMemo(
    () =>
      interval === CONTRIBUTION_INTERVALS.ONE_TIME ? (
        ''
      ) : (
        <span>
          , <strong>along with all future recurring payments</strong>
        </span>
      ),
    [interval]
  );

  const processingDate = useMemo(() => {
    switch (interval) {
      case CONTRIBUTION_INTERVALS.ONE_TIME:
        return format(new Date(), 'MMM do, y');
      case CONTRIBUTION_INTERVALS.MONTHLY:
        return `the ${format(new Date(), 'do')} of the month until you cancel`;
      case CONTRIBUTION_INTERVALS.ANNUAL:
        return `${format(new Date(), 'L/d')} yearly until you cancel`;
      default:
        throw new Error(`Don't know how to format a processing data for ${interval} interval`);
    }
  }, [interval]);

  const amountText = `${formattedAmount}${interval === CONTRIBUTION_INTERVALS.ONE_TIME ? '' : ','}`;

  return (
    <Root data-testid="donation-page-disclaimer">
      <p>
        By proceeding with this transaction, you agree to our{' '}
        <Link href={PRIVACY_POLICY_URL} target="_blank">
          privacy policy
        </Link>{' '}
        and{' '}
        <Link href={TS_AND_CS_URL} target="_blank">
          terms & conditions
        </Link>
        . Additionally, by proceeding with this transaction, you're authorizing today's payment{frequencySuffix} of{' '}
        <strong>
          <span data-testid="amount">{amountText}</span> to be processed on or adjacent to
          <span data-testid="processingDate">{processingDate}</span>.
        </strong>
      </p>
    </Root>
  );
}

export default ContributionDisclaimer;
