import { ContributionInterval } from 'constants/contributionIntervals';

type FrequencyLookup = Record<ContributionInterval, string>;

const frequencyAdjectives: FrequencyLookup = {
  one_time: 'One time',
  month: 'Monthly',
  year: 'Yearly'
};

const frequencyAdverbs: FrequencyLookup = {
  one_time: 'once',
  month: 'monthly',
  year: 'yearly'
};

const frequencyRates: FrequencyLookup = {
  one_time: '',
  month: '/month',
  year: '/year'
};

const frequencyThankYous: FrequencyLookup = {
  one_time: 'one-time',
  month: 'monthly',
  year: 'yearly'
};

export const getFrequencyAdjective = (frequency: ContributionInterval) => frequencyAdjectives[frequency] ?? '';
export const getFrequencyAdverb = (frequency: ContributionInterval) => frequencyAdverbs[frequency] ?? '';
export const getFrequencyRate = (frequency: ContributionInterval) => frequencyRates[frequency] ?? '';
export const getFrequencyThankYouText = (frequency: ContributionInterval) => frequencyThankYous[frequency] ?? '';
