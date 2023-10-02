import { ContributionInterval } from 'constants/contributionIntervals';
import i18n from 'i18next';

type FrequencyLookup = Record<ContributionInterval, string>;

export const getFrequencyAdjective = (frequency: ContributionInterval) => {
  const frequencyAdjectives: FrequencyLookup = {
    one_time: i18n.t('common.frequency.adjectives.oneTime'),
    month: i18n.t('common.frequency.adjectives.monthly'),
    year: i18n.t('common.frequency.adjectives.yearly')
  };
  return frequencyAdjectives[frequency] ?? '';
};

export const getFrequencyAdverb = (frequency: ContributionInterval) => {
  const frequencyAdverbs: FrequencyLookup = {
    one_time: i18n.t('common.frequency.adverbs.oneTime'),
    month: i18n.t('common.frequency.adverbs.monthly'),
    year: i18n.t('common.frequency.adverbs.yearly')
  };

  return frequencyAdverbs[frequency] ?? '';
};

export const getFrequencyRate = (frequency: ContributionInterval) => {
  const frequencyRates: FrequencyLookup = {
    one_time: '',
    month: i18n.t('common.frequency.rates.monthly'),
    year: i18n.t('common.frequency.rates.yearly')
  };
  return frequencyRates[frequency] ?? '';
};

export const getFrequencyThankYouText = (frequency: ContributionInterval) => {
  const frequencyThankYous: FrequencyLookup = {
    one_time: i18n.t('common.frequency.thankYous.oneTime'),
    month: i18n.t('common.frequency.thankYous.monthly'),
    year: i18n.t('common.frequency.thankYous.yearly')
  };
  return frequencyThankYous[frequency] ?? '';
};
