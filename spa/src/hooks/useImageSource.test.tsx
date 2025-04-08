import { renderHook } from '@testing-library/react-hooks';
import { useImageSource } from './useImageSource';

const mockUseTransformationsGetter = jest.fn();

jest.mock('appSettings', () => ({
  get USE_CLOUDFLARE_IMAGE_TRANSFORMATIONS() {
    return mockUseTransformationsGetter();
  }
}));

describe('useImageSource', () => {
  beforeEach(() => mockUseTransformationsGetter.mockReturnValue(true));

  it.each([[undefined], [null]])('returns undefined when passed %s', (source) =>
    expect(renderHook(() => useImageSource(source)).result.current).toBeUndefined()
  );

  describe('When passed a string', () => {
    it.each([
      ['a wrapped URL', true, '/cdn-cgi/image/format=auto/test-url'],
      ['the value as-is', false, 'test-url']
    ])('returns %s if USE_CLOUDFLARE_IMAGE_TRANSFORMATIONS is %s', (_, useTransforms, expected) => {
      mockUseTransformationsGetter.mockReturnValue(useTransforms);
      expect(renderHook(() => useImageSource('test-url')).result.current).toBe(expected);
    });
  });

  describe('When passed a file object', () => {
    const testFile = new File(['abc'], 'test.jpeg', { type: 'image/jpeg' });

    it('returns undefined immediately', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useImageSource(testFile));

      expect(result.current).toBeUndefined();
      await waitForNextUpdate();
    });

    it('returns a data URI once created', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useImageSource(testFile));

      expect(result.current).toBeUndefined();
      await waitForNextUpdate();
      expect(result.current).toBe(`data:image/jpeg;base64,${btoa('abc')}`);
    });
  });
});
