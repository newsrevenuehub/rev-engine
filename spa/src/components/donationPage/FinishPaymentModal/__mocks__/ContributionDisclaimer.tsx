import { ContributionDisclaimerProps } from '../ContributionDisclaimer';

export function ContributionDisclaimer({ formattedAmount, interval }: ContributionDisclaimerProps) {
  return (
    <div data-testid="mock-contribution-disclaimer" data-formatted-amount={formattedAmount} data-interval={interval} />
  );
}

export default ContributionDisclaimer;
