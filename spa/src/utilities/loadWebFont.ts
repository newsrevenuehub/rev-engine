import WebFont, { Config } from 'webfontloader';
import { GOOGLE_FONT_MODS } from 'constants/textConstants';

export interface LoadWebFontConfig {
  /**
   * Identifier for the font. For Monotype fonts, this is the font ID; for
   * Google Fonts, this is the `families` property.
   * @see https://github.com/typekit/webfontloader#google
   * @see https://github.com/typekit/webfontloader#typekit
   */
  accessor: string;
  /**
   * Font source. The webfontloader library supports additional sources, but we
   * only support Google and Typekit.
   */
  source: 'google' | 'typekit';
}

/**
 * Loads a Google or Typekit font, returning a promise that resolves when the
 * font has successfully loaded. If loading fails, the promise this function
 * returns rejects, but without any error.
 */
export function loadWebFont(fontObject: LoadWebFontConfig) {
  return new Promise<void>((resolve, reject) => {
    const baseConfig: Config = { active: resolve, inactive: reject };

    switch (fontObject.source) {
      case 'google':
        WebFont.load({ ...baseConfig, google: { families: [`${fontObject.accessor}:${GOOGLE_FONT_MODS}`] } });
        return;

      case 'typekit':
        WebFont.load({ ...baseConfig, typekit: { id: fontObject.accessor } });
        return;

      default:
        // Do nothing if the source is something else. This is maintaining
        // previous behavior and is something worth reviewing in the future to see
        // if we can be stricter.
        resolve();
    }
  });
}

export default loadWebFont;
