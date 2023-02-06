import { isStringInStringCaseInsensitive } from './isStringInString';

describe('isStringInString', () => {
  it.each([
    ['not match string if search has more chars than base', 'test', 'testing', undefined, false],
    ['match string case insensitive', 'TESTing', 'test', undefined, true],
    ['match string case insensitive', 'TEST', 'test', undefined, true],
    ['match string agnostic of spaces', 'T E ST', ' tes   t', undefined, true],
    ['match string agnostic of punctuation & special chars', '$T-E%.S/(^)*T', '_!te=s_[]}.t@', undefined, true]
  ])('should %s', (_, base, search, regex, result) => {
    expect(isStringInStringCaseInsensitive(base, search, regex)).toBe(result);
  });
});
