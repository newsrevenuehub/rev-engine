import { ContributionInterval } from 'constants/contributionIntervals';
import {
  getFrequencyAdjective,
  getFrequencyAdverb,
  getFrequencyRate,
  getFrequencyThankYouText
} from './parseFrequency';
import i18n from 'i18next';

jest.mock('i18next');

type TestList = [ContributionInterval, string][];

const adjectiveTests: TestList = [
  ['one_time', 'common.frequency.adjectives.oneTime'],
  ['month', 'common.frequency.adjectives.monthly'],
  ['year', 'common.frequency.adjectives.yearly']
];

const adverbTests: TestList = [
  ['one_time', 'common.frequency.adverbs.oneTime'],
  ['month', 'common.frequency.adverbs.monthly'],
  ['year', 'common.frequency.adverbs.yearly']
];

const rateTests: TestList = [
  ['one_time', ''],
  ['month', 'common.frequency.rates.monthly'],
  ['year', 'common.frequency.rates.yearly']
];

const thankYouTests: TestList = [
  ['one_time', 'common.frequency.thankYous.oneTime'],
  ['month', 'common.frequency.thankYous.monthly'],
  ['year', 'common.frequency.thankYous.yearly']
];

const badFrequencies = [undefined, null, '', 'bad', 1, true];

describe('parseFrequency', () => {
  const i18nMock = i18n as jest.Mocked<any>;

  beforeEach(() => {
    i18nMock.t.mockImplementation((key: string) => key);
  });

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
