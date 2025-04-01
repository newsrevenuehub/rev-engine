export function useImageSource(source?: null | string | File) {
  if (!source) {
    return;
  }

  if (source instanceof File) {
    return `mock-use-image-source-${source.name}`;
  }

  return `mock-use-image-source-${source}`;
}
