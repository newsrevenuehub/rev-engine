import { useEffect } from 'react';

export const CLEARBIT_SCRIPT_SRC = 'https://risk.clearbit.com/v1/risk.js';

/**
 * useClearbit
 * Adds "risk" script from clearbit.js per clearbit docs
 * @param {Boolean} live - Only adds clearbit if live is true
 */
function useClearbit(live) {
  useEffect(() => {
    if (live) {
      const script = document.createElement('script');
      script.async = true;
      script.src = CLEARBIT_SCRIPT_SRC;
      const parent = document.getElementsByTagName('script')[0];
      parent.parentNode.insertBefore(script, parent);

      return () => document.removeElement(script);
    }
  }, [live]);
}

export default useClearbit;
