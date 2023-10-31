import {
  CONTAINS_COLON_ERROR,
  CONTAINS_SEMICOLON_ERROR,
  TOO_LONG_ERROR,
  cleanSwagValue,
  validateSwagValue
} from './swagValue';

describe('cleanSwagValue', () => {
  it('leaves valid values alone', () => expect(cleanSwagValue('OK_value123')).toBe('OK_value123'));
  it('replaces invalid characters', () => expect(cleanSwagValue('bad_! ⚠️ value')).toBe('bad______value'));
});

describe('validateSwagValue', () => {
  it('accepts an empty string', () => expect(validateSwagValue('')).toBeUndefined());

  it('accepts a string of 100 characters with no : or ; characters', () =>
    expect(validateSwagValue('x'.repeat(100))).toBeUndefined());

  it('rejects a string more than 100 characters long', () =>
    expect(validateSwagValue('x'.repeat(101))).toBe(TOO_LONG_ERROR));

  it('rejects a string with a : character', () => expect(validateSwagValue('ab:cd')).toBe(CONTAINS_COLON_ERROR));

  it('rejects a string with a ; character', () => expect(validateSwagValue('ab;cd')).toBe(CONTAINS_SEMICOLON_ERROR));
});
