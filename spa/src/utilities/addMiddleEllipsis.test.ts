import addMiddleEllipsis, { MAX_LENGTH, POST_ELLIPSIS_SIZE, PRE_ELLIPSIS_SIZE } from './addMiddleEllipsis';

describe('addMiddleEllipsis', () => {
  describe.each([
    ['default (length 35)', undefined, undefined, undefined],
    ['custom long (length 50)', 50, undefined, undefined],
    ['custom short (length 10)', 10, undefined, undefined]
  ])('max string size = %s', (_, maxSize, preEllipsis, postEllipsis) => {
    const nonNullMaxSize = maxSize ?? MAX_LENGTH;

    it(`should return the original string if it's less than or equal to ${maxSize ?? MAX_LENGTH} characters`, () => {
      expect(addMiddleEllipsis('x'.repeat(nonNullMaxSize), maxSize, preEllipsis, postEllipsis)).toBe(
        'x'.repeat(nonNullMaxSize)
      );
    });

    it(`should return a string with an ellipsis in the middle`, () => {
      const beforeEllipsis = nonNullMaxSize < MAX_LENGTH ? nonNullMaxSize / 2 : PRE_ELLIPSIS_SIZE;
      const afterEllipsis = nonNullMaxSize < MAX_LENGTH ? nonNullMaxSize / 5 : POST_ELLIPSIS_SIZE;

      expect(addMiddleEllipsis('x'.repeat(nonNullMaxSize + 1), maxSize, preEllipsis, postEllipsis)).toBe(
        'x'.repeat(preEllipsis ?? beforeEllipsis) + '…' + 'x'.repeat(postEllipsis ?? afterEllipsis)
      );
      expect(addMiddleEllipsis('x'.repeat(nonNullMaxSize * 2), maxSize, preEllipsis, postEllipsis)).toBe(
        'x'.repeat(preEllipsis ?? beforeEllipsis) + '…' + 'x'.repeat(postEllipsis ?? afterEllipsis)
      );
    });
  });
});
