import addMiddleEllipsis, { MAX_LENGTH } from './addMiddleEllipsis';

describe('addMiddleEllipsis', () => {
  describe.each([
    ['default (length 35)', undefined, 17, 17],
    ['custom long (length 50)', 50, 25, 24],
    ['custom short (length 10)', 10, 5, 4]
  ])('max string size = %s', (_, maxSize, preEllipsis, postEllipsis) => {
    const nonNullMaxSize = maxSize ?? MAX_LENGTH;

    it(`should return the original string if it's less than or equal to ${maxSize ?? MAX_LENGTH} characters`, () => {
      expect(addMiddleEllipsis('x'.repeat(nonNullMaxSize), maxSize)).toBe('x'.repeat(nonNullMaxSize));
    });

    it(`should return a string with an ellipsis in the middle`, () => {
      expect(addMiddleEllipsis('x'.repeat(nonNullMaxSize + 1), maxSize)).toBe(
        'x'.repeat(preEllipsis) + '…' + 'x'.repeat(postEllipsis)
      );
      expect(addMiddleEllipsis('x'.repeat(nonNullMaxSize * 2), maxSize)).toBe(
        'x'.repeat(preEllipsis) + '…' + 'x'.repeat(postEllipsis)
      );
    });
  });
});
