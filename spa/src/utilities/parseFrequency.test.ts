import { ContributionInterval } from 'constants/contributionIntervals';
import { getFrequencyAdjective } from './parseFrequency';

type TestList = [ContributionInterval, string][];

const adjectiveTests: TestList = [
  ['one_time', 'One time'],
  ['month', 'Monthly'],
  ['year', 'Yearly']
];

const badFrequencies = [undefined, null, '', 'bad', 1, true];

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
