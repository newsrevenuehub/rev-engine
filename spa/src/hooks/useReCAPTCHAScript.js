import { useEffect } from 'react';

// Constants
import { GRECAPTCHA_SCRIPT_URL, GRECAPTCHA_SITE_KEY } from 'settings';

/**
 * Load Google reCAPTCHA script and set token callback
 * https://developers.google.com/recaptcha/docs/v3#programmatically_invoke_the_challenge
 */
function useReCAPTCHAScript() {
  /**
   * Load the gReCAPTCHA script with site key on mount.
   */
  useEffect(() => {
    const script = document.createElement('script');
    script.src = GRECAPTCHA_SCRIPT_URL + `?render=${GRECAPTCHA_SITE_KEY}`;
    script.nonce = window.csp_nonce;
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);
}

export default useReCAPTCHAScript;
