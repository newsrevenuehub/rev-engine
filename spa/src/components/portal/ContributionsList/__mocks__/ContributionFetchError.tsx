import { ContributionFetchErrorProps } from '../ContributionFetchError';

export const ContributionFetchError = ({ onRetry }: ContributionFetchErrorProps) => (
  <button data-testid="mock-contribution-fetch-error" onClick={onRetry}>
    onRetry
  </button>
);

export default ContributionFetchError;
