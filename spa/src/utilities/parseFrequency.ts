import { ContributionInterval } from 'constants/contributionIntervals';

type FrequencyLookup = Record<ContributionInterval, string>;

/**
 * Returns the English adjective describing a contribution interval. This
 * intentionally is not localized. If you need localized text, use
 * `useTranslation()` instead.
 */
export const getFrequencyAdjective = (frequency: ContributionInterval) => {
  const frequencyAdjectives: FrequencyLookup = {
    one_time: 'One-time',
    month: 'Monthly',
    year: 'Yearly'
  };

  return frequencyAdjectives[frequency] ?? '';
};
