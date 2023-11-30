import formatCurrencyAmount from './formatCurrencyAmount';

describe('formatCurrencyAmount', () => {
  it('formats a number with cents', () => expect(formatCurrencyAmount(12345)).toBe('$123.45'));
  it('formats a round number with two decimal places by default', () =>
    expect(formatCurrencyAmount(12300)).toBe('$123.00'));
  it('formats a round number without decimal places if requested', () =>
    expect(formatCurrencyAmount(12300, true)).toBe('$123'));
});
