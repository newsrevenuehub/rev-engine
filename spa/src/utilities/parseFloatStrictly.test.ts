import { parseFloatStrictly } from './parseFloatStrictly';

describe('parseFloatStrictly', () => {
  it('parses valid floating-point numbers', () => {
    expect(parseFloatStrictly('1.23')).toBe(1.23);
    expect(parseFloatStrictly('1.0')).toBe(1);
    expect(parseFloatStrictly('1')).toBe(1);
    expect(parseFloatStrictly('1.')).toBe(1);
  });

  it('ignores whitespace', () => {
    expect(parseFloatStrictly('1 ')).toBe(1);
    expect(parseFloatStrictly(' 1')).toBe(1);
    expect(parseFloatStrictly(' 1 ')).toBe(1);
  });

  it('parses 0', () => {
    expect(parseFloatStrictly('0')).toBe(0);
    expect(parseFloatStrictly('0.')).toBe(0);
    expect(parseFloatStrictly('0.0')).toBe(0);
  });

  it('parses negative numbers', () => {
    expect(parseFloatStrictly('-1.23')).toBe(-1.23);
    expect(parseFloatStrictly('-1.0')).toBe(-1);
    expect(parseFloatStrictly('-1')).toBe(-1);
    expect(parseFloatStrictly('-1.')).toBe(-1);
  });

  it('returns NaN if the number has too many decimal places', () => {
    expect(parseFloatStrictly('1.234', 2)).toBeNaN();
    expect(parseFloatStrictly('1.23', 1)).toBeNaN();
    expect(parseFloatStrictly('1.2', 0)).toBeNaN();
  });

  it('returns NaN if the string is not a number', () => {
    expect(parseFloatStrictly('1.2.3')).toBeNaN();
    expect(parseFloatStrictly('1.foo')).toBeNaN();
    expect(parseFloatStrictly('1foo')).toBeNaN();
    expect(parseFloatStrictly('1 foo')).toBeNaN();
    expect(parseFloatStrictly('foo')).toBeNaN();
    expect(parseFloatStrictly('1.2-')).toBeNaN();
    expect(parseFloatStrictly('1.-2')).toBeNaN();
    expect(parseFloatStrictly('-1.-2')).toBeNaN();
  });

  it('returns NaN for an empty string', () => expect(parseFloatStrictly('')).toBeNaN());

  it('returns NaN for strings of only whitespace', () => {
    expect(parseFloatStrictly(' ')).toBeNaN();
    expect(parseFloatStrictly('  ')).toBeNaN();
  });
});
