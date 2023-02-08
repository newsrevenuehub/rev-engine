import { isValidWebUrl } from './isValidWebUrl';

describe('isValidWebUrl', () => {
  it('returns true for a https:// URL', () => expect(isValidWebUrl('https://fundjournalism.org/')).toBe(true));
  it('returns true for a https:// URL with querystring', () =>
    expect(isValidWebUrl('https://fundjournalism.org/?foo=true')).toBe(true));
  it('returns true for a https:// URL with querystring and hash', () =>
    expect(isValidWebUrl('https://fundjournalism.org/#top?foo=true')).toBe(true));
  it('returns true for a http:// URL', () => expect(isValidWebUrl('http://fundjournalism.org/')).toBe(true));
  it('returns true for a http:// URL with querystring', () =>
    expect(isValidWebUrl('http://fundjournalism.org/?foo=true')).toBe(true));
  it('returns true for a http:// URL with querystring and hash', () =>
    expect(isValidWebUrl('http://fundjournalism.org/#top?foo=true')).toBe(true));
  it('returns false for a mailto:// URL', () => expect(isValidWebUrl('mailto:nobody@fundjournalism.org')).toBe(false));
  it('returns true for a URL with an escaped space', () =>
    expect(isValidWebUrl('https://fundjournalism.org/%20somewhere')).toBe(true));
  it('returns true for an empty string if allowEmpty is true', () => expect(isValidWebUrl('', true)).toBe(true));
  it('returns false for an empty string if allowEmpty is false', () => expect(isValidWebUrl('')).toBe(false));
  it('returns false for a protocol-less URL', () => expect(isValidWebUrl('fundjournalism.org')).toBe(false));
  it('returns false for a URL with an unescaped space', () =>
    expect(isValidWebUrl('https://fund journalism.org')).toBe(false));
});
