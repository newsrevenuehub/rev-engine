import validateInputPositiveFloat from './validateInputPositiveFloat';

describe('validatePositiveFloat', () => {
  it('returns true for a positive float', () => {
    expect(validateInputPositiveFloat('1.23')).toBe(true);
    expect(validateInputPositiveFloat('1.0')).toBe(true);
    expect(validateInputPositiveFloat('1')).toBe(true);
    expect(validateInputPositiveFloat('1.')).toBe(true);
  });

  it('ignores whitespace', () => {
    expect(validateInputPositiveFloat('1 ')).toBe(true);
    expect(validateInputPositiveFloat(' 1')).toBe(true);
    expect(validateInputPositiveFloat(' 1 ')).toBe(true);
  });

  it('returns false for 0', () => {
    expect(validateInputPositiveFloat('0')).toBe(false);
    expect(validateInputPositiveFloat('0.')).toBe(false);
    expect(validateInputPositiveFloat('0.0')).toBe(false);
  });

  it('returns false for negative numbers', () => {
    expect(validateInputPositiveFloat('-1.23')).toBe(false);
    expect(validateInputPositiveFloat('-1.0')).toBe(false);
    expect(validateInputPositiveFloat('-1')).toBe(false);
    expect(validateInputPositiveFloat('-1.')).toBe(false);
  });

  it('returns false if the number has too many decimal places', () => {
    expect(validateInputPositiveFloat('1.234', 2)).toBe(false);
    expect(validateInputPositiveFloat('1.23', 1)).toBe(false);
    expect(validateInputPositiveFloat('1.2', 0)).toBe(false);
  });

  it('returns false if the string is not a number', () => {
    expect(validateInputPositiveFloat('1.2.3')).toBe(false);
    expect(validateInputPositiveFloat('1.foo')).toBe(false);
    expect(validateInputPositiveFloat('1foo')).toBe(false);
    expect(validateInputPositiveFloat('1 foo')).toBe(false);
    expect(validateInputPositiveFloat('foo')).toBe(false);
  });

  it('returns false for an empty string', () => expect(validateInputPositiveFloat('')).toBe(false));

  it('returns false for strings of only whitespace', () => {
    expect(validateInputPositiveFloat(' ')).toBe(false);
    expect(validateInputPositiveFloat('  ')).toBe(false);
  });
});
