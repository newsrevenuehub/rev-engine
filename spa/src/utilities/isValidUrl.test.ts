import { isValidUrl } from './isValidUrl';

describe('isValidUrl', () => {
  it('returns true for a https:// URL', () => expect(isValidUrl('https://fundjournalism.org/')).toBe(true));
  it('returns true for a https:// URL with querystring', () =>
    expect(isValidUrl('https://fundjournalism.org/?foo=true')).toBe(true));
  it('returns true for a https:// URL with querystring and hash', () =>
    expect(isValidUrl('https://fundjournalism.org/#top?foo=true')).toBe(true));
  it('returns true for a http:// URL', () => expect(isValidUrl('http://fundjournalism.org/')).toBe(true));
  it('returns true for a http:// URL with querystring', () =>
    expect(isValidUrl('http://fundjournalism.org/?foo=true')).toBe(true));
  it('returns true for a http:// URL with querystring and hash', () =>
    expect(isValidUrl('http://fundjournalism.org/#top?foo=true')).toBe(true));
  it('returns true for a mailto:// URL', () => expect(isValidUrl('mailto:nobody@fundjournalism.org')).toBe(true));
  it('returns true for a URL with an escaped space', () =>
    expect(isValidUrl('https://fund%20journalism.org')).toBe(false));
  it('returns true for an empty string if allowEmpty is true', () => expect(isValidUrl('', true)).toBe(true));
  it('returns false for an empty string if allowEmpty is false', () => expect(isValidUrl('')).toBe(false));
  it('returns false for a protocol-less URL', () => expect(isValidUrl('fundjournalism.org')).toBe(false));
  it('returns false for a URL with an unescaped space', () =>
    expect(isValidUrl('https://fund journalism.org')).toBe(false));
});
