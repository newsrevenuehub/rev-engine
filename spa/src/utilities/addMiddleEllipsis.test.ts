import addMiddleEllipsis, { MAX_LENGTH } from './addMiddleEllipsis';

describe('addMiddleEllipsis', () => {
  describe.each([
    ['default', MAX_LENGTH],
    ['custom', 50]
  ])('max string size = %s', (_, maxSize) => {
    it(`should return the original string if it's less than or equal to ${maxSize} characters`, () => {
      expect(addMiddleEllipsis('foo', maxSize)).toBe('foo');
      expect(addMiddleEllipsis('foo bar', maxSize)).toBe('foo bar');
      expect(addMiddleEllipsis('foo bar baz', maxSize)).toBe('foo bar baz');
      expect(addMiddleEllipsis('foo bar baz', maxSize)).toBe('foo bar baz');
      expect(addMiddleEllipsis('x'.repeat(maxSize), maxSize)).toBe('x'.repeat(maxSize));
    });

    it(`should return a string with an ellipsis in the middle`, () => {
      expect(addMiddleEllipsis('x'.repeat(maxSize + 1), maxSize)).toBe('x'.repeat(20) + '…' + 'x'.repeat(10));
      expect(addMiddleEllipsis('x'.repeat(maxSize * 2), maxSize)).toBe('x'.repeat(20) + '…' + 'x'.repeat(10));
    });
  });
});
