import { ContributionInterval } from 'constants/contributionIntervals';
import i18n from 'i18n';

type FrequencyLookup = Record<ContributionInterval, string>;

export const getFrequencyAdjective = (frequency: ContributionInterval) => {
  const frequencyAdjectives: FrequencyLookup = {
    one_time: i18n.t('common.frequency.adjectives.one_time'),
    month: i18n.t('common.frequency.adjectives.month'),
    year: i18n.t('common.frequency.adjectives.year')
  };
  return frequencyAdjectives[frequency] ?? '';
};

export const getFrequencyAdverb = (frequency: ContributionInterval) => {
  const frequencyAdverbs: FrequencyLookup = {
    one_time: i18n.t('common.frequency.adverbs.one_time'),
    month: i18n.t('common.frequency.adverbs.month'),
    year: i18n.t('common.frequency.adverbs.year')
  };

  return frequencyAdverbs[frequency] ?? '';
};

export const getFrequencyRate = (frequency: ContributionInterval) => {
  const frequencyRates: FrequencyLookup = {
    one_time: '',
    month: i18n.t('common.frequency.rates.month'),
    year: i18n.t('common.frequency.rates.year')
  };
  return frequencyRates[frequency] ?? '';
};

export const getFrequencyThankYouText = (frequency: ContributionInterval) => {
  const frequencyThankYous: FrequencyLookup = {
    one_time: i18n.t('common.frequency.thankYous.one_time'),
    month: i18n.t('common.frequency.thankYous.month'),
    year: i18n.t('common.frequency.thankYous.year')
  };
  return frequencyThankYous[frequency] ?? '';
};
