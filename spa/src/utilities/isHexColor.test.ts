import { isHexColor } from './isHexColor';

describe('isHexColor', () => {
  it('returns true for a full hex triplet prefixed by #', () => {
    expect(isHexColor('#12ab3f')).toBe(true);
    expect(isHexColor('#12AB3F')).toBe(true);
    expect(isHexColor('#111111')).toBe(true);
    expect(isHexColor('#ffffff')).toBe(true);
  });
  it('returns false for a hex triplet shorthand', () => expect(isHexColor('#111')).toBe(false));
  it('returns false if there are too many characters', () => expect(isHexColor('#12ab3f0')).toBe(false));
  it('returns false if the # prefix is missing', () => expect(isHexColor('12ab3f')).toBe(false));
  it('returns false if there is trailing whitespace', () => expect(isHexColor('#12ab3f ')).toBe(false));
  it('returns false if there is leading whitespace', () => expect(isHexColor(' #12ab3f')).toBe(false));
  it('returns false if the string is empty', () => expect(isHexColor('')).toBe(false));
});
