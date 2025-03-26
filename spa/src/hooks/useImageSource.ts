import { USE_CLOUDFLARE_IMAGE_TRANSFORMATIONS } from 'appSettings';
import { useEffect, useState } from 'react';
import fileToDataUrl from 'utilities/fileToDataUrl';

/**
 * Provides a string URL for an image source: either a string URL where the
 * image has been uploaded, or a File object pointing to an image. When
 * contribution pages are edited, for example, images that haven't been
 * persisted yet are set as File objects.
 *
 * An undefined or null value can be provided while data is loading. In this
 * case, the hook returns an undefined value.
 *
 * If a file is provided, then this will at first return undefined, then a
 * string URL for a data: URI.
 *
 * If a URL is provided, this will use Cloudflare Image Transformations to serve
 * it if the env variable `SPA_ENV_USE_CLOUDFLARE_IMAGE_TRANSFORMATIONS` is set.
 * Image Transformations must also be enabled for the domain in Cloudflare;
 * otherwise, you'll get broken images.
 *
 * @see
 * https://developers.cloudflare.com/images/transform-images/transform-via-url/
 *
 * @param source source image URL or File object
 * @param options
 */
export function useImageSource(source?: null | string | File) {
  const [srcUrl, setSrcUrl] = useState<string>();

  useEffect(() => {
    async function generateSrc() {
      if (source instanceof File) {
        setSrcUrl(await fileToDataUrl(source));
      } else if (typeof source === 'string') {
        setSrcUrl(USE_CLOUDFLARE_IMAGE_TRANSFORMATIONS ? `/cdn-cgi/image/format=auto/${source}` : source);
      }
    }

    generateSrc();
  }, [source]);

  return srcUrl;
}
