import { useEffect } from 'react';
import loadWebFont from 'utilities/loadWebFont';

const NO_OP = () => {};

function useWebFonts(fonts = {}, { onSuccess = NO_OP, onError = NO_OP } = {}) {
  useEffect(() => {
    if (typeof fonts === 'string') return;
    Object.keys(fonts).forEach((fontKey) => {
      loadWebFont(fonts[fontKey]).then(onSuccess, onError);
    });
  }, [fonts, onSuccess, onError]);
}

export default useWebFonts;
