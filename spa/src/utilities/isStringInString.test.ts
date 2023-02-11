import { isStringInStringCaseInsensitive } from './isStringInString';

describe('isStringInString', () => {
  it.each([
    ['not match string if search has more chars than base', 'test', 'testing', false],
    ['match string case insensitive', 'TESTing', 'test', true],
    ['match string case insensitive', 'TEST', 'test', true],
    ['match string agnostic of spaces', 'T E ST', ' tes   t', true],
    ['match string agnostic of punctuation & special chars', '$T-E%.S/(^)*T', '_!te=s_[]}.t@', true]
  ])('should %s', (_, base, search, result) => {
    expect(isStringInStringCaseInsensitive(base, search)).toBe(result);
  });
});
