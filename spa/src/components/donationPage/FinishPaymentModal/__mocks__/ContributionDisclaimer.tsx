import { ContributionDisclaimerProps } from '../ContributionDisclaimer';

export function ContributionDisclaimer({ formattedAmount, interval, processingDate }: ContributionDisclaimerProps) {
  return (
    <div
      data-testid="mock-contribution-disclaimer"
      data-formatted-amount={formattedAmount}
      data-interval={interval}
      data-processing-date={processingDate}
    />
  );
}

export default ContributionDisclaimer;
