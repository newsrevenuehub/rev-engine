import { useEffect } from 'react';

import { TURSNTILE_SCRIPT_URL } from 'appSettings';

/**
 * Load Google reCAPTCHA script and set token callback
 * https://developers.google.com/recaptcha/docs/v3#programmatically_invoke_the_challenge
 */
function useTurnstileCAPTCHAScript() {
  /**
   * Load the Turnstile script with reCAPTCHA compatibility and onLoad function
   */
  useEffect(() => {
    const script = document.createElement('script');
    script.src = TURSNTILE_SCRIPT_URL;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);
}

export default useTurnstileCAPTCHAScript;
