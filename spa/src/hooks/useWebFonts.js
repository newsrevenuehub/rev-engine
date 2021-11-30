import { useEffect } from 'react';
import loadWebFont from 'utilities/loadWebFont';

function useWebFonts(fonts = {}, { context, onSuccess = () => {}, onError = () => {} } = {}) {
  useEffect(() => {
    Object.keys(fonts).forEach((fontKey) => {
      loadWebFont(fonts[fontKey], context).then(onSuccess, onError);
    });
  }, [fonts, onSuccess, onError]);
}

export default useWebFonts;
