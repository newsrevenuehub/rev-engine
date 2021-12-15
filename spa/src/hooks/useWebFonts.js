import { useEffect } from 'react';
import loadWebFont from 'utilities/loadWebFont';

function useWebFonts(fonts = {}, { onSuccess = () => {}, onError = () => {} } = {}) {
  useEffect(() => {
    Object.keys(fonts).forEach((fontKey) => {
      loadWebFont(fonts[fontKey]).then(onSuccess, onError);
    });
  }, [fonts, onSuccess, onError]);
}

export default useWebFonts;
