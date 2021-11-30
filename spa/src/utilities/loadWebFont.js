import { GOOGLE_FONT_MODS } from 'constants/genericConstants';

const loadWebFont = (fontObj) =>
  new Promise((resolve, reject) => {
    const webfontConfig = {};
    if (fontObj.source === 'typekit') {
      webfontConfig.id = fontObj.accessor;
    }
    if (fontObj.source === 'google') {
      webfontConfig.families = [`${fontObj.accessor}:${GOOGLE_FONT_MODS}`];
    }

    window.WebFont.load({
      [fontObj.source]: webfontConfig,
      active: resolve,
      inactive: reject
    });
  });

export default loadWebFont;
