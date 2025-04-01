import { USE_CLOUDFLARE_IMAGE_TRANSFORMATIONS } from 'appSettings';
import { useEffect, useState } from 'react';
import fileToDataUrl from 'utilities/fileToDataUrl';

/**
 * Converts an image source to a string URL. The source can be:
 *
 * - A URL where the image has been uploaded
 *   The hook will use Cloudflare Image Transformations to serve it if the env variable
 *   `SPA_ENV_USE_CLOUDFLARE_IMAGE_TRANSFORMATIONS` is set. If this environment
 *   variable is set, Image Transformations must also be enabled on the domain in
 *   Cloudflare. If it isn't enabled in Cloudflare but the env variable is
 *   set, broken images will be shown.
 *
 * - A File object containing an image
 *   The hook will at first return `undefined`, then a string `data:uri` that will
 *   display the image. Cloudflare Image Transformations isn't involved in this
 *   scenario.
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
