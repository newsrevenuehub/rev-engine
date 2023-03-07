import fileToDataUrl from './fileToDataUrl';

describe('fileToDataUrl', () => {
  const testFile = new File(['abc'], 'test.jpeg');

  it('resolves to a data URI for a file', async () => {
    expect(await fileToDataUrl(testFile)).toBe(`data:application/octet-stream;base64,${window.btoa('abc')}`);
  });

  it('rejects if reading the file fails', async () => {
    const readAsDataUrlSpy = jest.spyOn(FileReader.prototype, 'readAsDataURL');

    // Avoiding an arrow function to keep `this` binding.

    readAsDataUrlSpy.mockImplementation(function () {
      // @ts-expect-error TypeScript doesn't like this usage of `this` because
      // it doesn't know what the function is being attached to.
      (this as any).onloaderror(new Error());
    });

    await expect(() => fileToDataUrl(testFile)).rejects.toBeInstanceOf(Error);
  });

  it('rejects if reading the file succeeds but the resulting event has no target', async () => {
    const readAsDataUrlSpy = jest.spyOn(FileReader.prototype, 'readAsDataURL');

    // Avoiding an arrow function to keep `this` binding.

    readAsDataUrlSpy.mockImplementation(function () {
      // @ts-expect-error See comment above.
      (this as any).onload({});
    });

    await expect(() => fileToDataUrl(testFile)).rejects.toBeInstanceOf(Error);
  });
});
