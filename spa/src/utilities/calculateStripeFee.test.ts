import { ContributionInterval } from 'constants/contributionIntervals';
import calculateStripeFee, { roundTo2DecimalPlaces } from './calculateStripeFee';

describe('roundTo2DecimalPlaces', () => {
  it('rounds a number to 2 decimal places', () => {
    expect(roundTo2DecimalPlaces(1)).toBe(1);
    expect(roundTo2DecimalPlaces(0)).toBe(0);
    expect(roundTo2DecimalPlaces(-1)).toBe(-1);
    expect(roundTo2DecimalPlaces(1.234)).toBe(1.23);
    expect(roundTo2DecimalPlaces(1.2345)).toBe(1.23);
    expect(roundTo2DecimalPlaces(1.2349)).toBe(1.23);
    expect(roundTo2DecimalPlaces(1.235)).toBe(1.24);
    expect(roundTo2DecimalPlaces(-1.234)).toBe(-1.23);
    expect(roundTo2DecimalPlaces(-1.2345)).toBe(-1.23);
    expect(roundTo2DecimalPlaces(-1.2349)).toBe(-1.23);
    expect(roundTo2DecimalPlaces(-1.235)).toBe(-1.24);
  });
});

describe('calculateStripeFee', () => {
  let cost: number;

  beforeEach(() => (cost = roundTo2DecimalPlaces(Math.random() * 10000)));

  it("returns null if given a string that can't be converted to a number", () => {
    expect(calculateStripeFee('foo', 'one_time', false)).toBeNull();
    expect(calculateStripeFee('', 'one_time', false)).toBeNull();
    expect(calculateStripeFee(null as any, 'one_time', false)).toBeNull();
  });

  it('returns null if given a negative number', () => {
    expect(calculateStripeFee('-1', 'one_time', false)).toBeNull();
    expect(calculateStripeFee('-1.23', 'one_time', false)).toBeNull();
  });

  // These tests use a random number to help with coverage. e.g. if these tests
  // are being flaky, there's likely a bug in our algorithm that only occurs
  // with a particular number range.
  //
  // See
  // https://support.stripe.com/questions/passing-the-stripe-fee-on-to-customers
  //
  // We don't currently charge extra for recurring payments, so whether a
  // payment is recurring _shouldn't_ matter.

  describe.each([['one_time'], ['month'], ['year']])('for %s payments', (frequency) => {
    const freq = frequency as ContributionInterval;

    it('uses a $0.30 + 2.2% fee rate for nonprofits', () => {
      const expected = roundTo2DecimalPlaces((cost + 0.3) / (1 - 0.022) - cost);

      expect(calculateStripeFee(cost, freq, true)).toBe(expected);
      expect(calculateStripeFee(cost.toString(), freq, true)).toBe(expected);
      expect(calculateStripeFee(0, freq, true)).toBe(0.31);
      expect(calculateStripeFee('0', freq, true)).toBe(0.31);
    });

    it('uses a $0.30 + 2.9% fee rate for for-profits', () => {
      const expected = roundTo2DecimalPlaces((cost + 0.3) / (1 - 0.029) - cost);

      expect(calculateStripeFee(cost, freq, false)).toBe(expected);
      expect(calculateStripeFee(cost.toString(), freq, false)).toBe(expected);
      expect(calculateStripeFee(0, freq, false)).toBe(0.31);
      expect(calculateStripeFee('0', freq, false)).toBe(0.31);
    });
  });
});
