import { ContributionInterval } from 'constants/contributionIntervals';
import {
  getFrequencyAdjective,
  getFrequencyAdverb,
  getFrequencyRate,
  getFrequencyThankYouText
} from './parseFrequency';

type TestList = [ContributionInterval, string][];

const adjectiveTests: TestList = [
  ['one_time', 'common.frequency.adjectives.one_time'],
  ['month', 'common.frequency.adjectives.month'],
  ['year', 'common.frequency.adjectives.year']
];

const adverbTests: TestList = [
  ['one_time', 'common.frequency.adverbs.one_time'],
  ['month', 'common.frequency.adverbs.month'],
  ['year', 'common.frequency.adverbs.year']
];

const rateTests: TestList = [
  ['one_time', ''],
  ['month', 'common.frequency.rates.month'],
  ['year', 'common.frequency.rates.year']
];

const thankYouTests: TestList = [
  ['one_time', 'common.frequency.thankYous.one_time'],
  ['month', 'common.frequency.thankYous.month'],
  ['year', 'common.frequency.thankYous.year']
];

const badFrequencies = [undefined, null, '', 'bad', 1, true];

describe('parseFrequency', () => {
  describe('getFrequencyAdjective', () => {
    it.each(adjectiveTests)('returns the relevant adjective for the %s frequency', (freq, result) =>
      expect(getFrequencyAdjective(freq)).toBe(result)
    );

    it('returns an empty string if given an invalid frequency', () => {
      for (const freq of badFrequencies) {
        expect(getFrequencyAdjective(freq as any)).toBe('');
      }
    });
  });

  describe('getFrequencyAdverb', () => {
    it.each(adverbTests)('returns the relevant adverb for the %s frequency', (freq, result) =>
      expect(getFrequencyAdverb(freq)).toBe(result)
    );

    it('returns an empty string if given an invalid frequency', () => {
      for (const freq of badFrequencies) {
        expect(getFrequencyAdverb(freq as any)).toBe('');
      }
    });
  });

  describe('getFrequencyRate', () => {
    it.each(rateTests)('returns the relevant rate for the %s frequency', (freq, result) =>
      expect(getFrequencyRate(freq)).toBe(result)
    );

    it('returns an empty string if given an invalid frequency', () => {
      for (const freq of badFrequencies) {
        expect(getFrequencyRate(freq as any)).toBe('');
      }
    });
  });

  describe('getFrequencyThankYouText', () => {
    it.each(thankYouTests)('returns the relevant thank-you text for the %s frequency', (freq, result) =>
      expect(getFrequencyThankYouText(freq)).toBe(result)
    );

    it('returns an empty string if given an invalid frequency', () => {
      for (const freq of badFrequencies) {
        expect(getFrequencyThankYouText(freq as any)).toBe('');
      }
    });
  });
});
