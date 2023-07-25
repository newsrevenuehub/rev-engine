import { useEffect, useState } from 'react';
import useUser from './useUser';
import useConnectStripeAccount from './useConnectStripeAccount';
import useConnectMailchimp from './useConnectMailchimp';
import { getUserRole } from 'utilities/getUserRole';
import { PENDO_API_KEY, PENDO_VISITOR_PREFIX } from 'appSettings';

/**
 * We need to ensure the Pendo script only ever runs once. This records it
 * globally so that if the hook is invoked multiple times, there's only one
 * active one in the DOM.
 */
let loaderScript: HTMLElement;

/**
 * Initializes Pendo with the active user. This will not work in an
 * unauthenticated context.
 * @see
 * https://support.pendo.io/hc/en-us/articles/360031862272-Installation-for-single-page-frameworks
 */
export function usePendo() {
  const [needsInit, setNeedsInit] = useState(false);
  const { user } = useUser();
  const { isLoading: stripeIsLoading, requiresVerification } = useConnectStripeAccount();
  const { isLoading: mailchimpIsLoading, connectedToMailchimp } = useConnectMailchimp();

  // Add the Pendo loader snippet if it hasn't ever been.

  useEffect(() => {
    if (!PENDO_API_KEY || !PENDO_VISITOR_PREFIX) {
      // Pendo wasn't configured correctly.
      return;
    }

    if (loaderScript?.isConnected) {
      // Another invocation of the hook already ran and presumably initialized
      // Pendo. It's possible the loader script was removed after it was added
      // to the DOM by us, probably in a test context.
      return;
    }

    loaderScript = document.createElement('script');
    loaderScript.setAttribute('nonce', (window as any).csp_nonce);
    loaderScript.innerHTML = `(function(apiKey){
      (function(p,e,n,d,o){var v,w,x,y,z;o=p[d]=p[d]||{};o._q=o._q||[];
      v=['initialize','identify','updateOptions','pageLoad','track'];for(w=0,x=v.length;w<x;++w)(function(m){
          o[m]=o[m]||function(){o._q[m===v[0]?'unshift':'push']([m].concat([].slice.call(arguments,0)));};})(v[w]);
          y=e.createElement(n);y.async=!0;y.src='https://cdn.pendo.io/agent/static/'+apiKey+'/pendo.js';
          z=e.getElementsByTagName(n)[0];z.parentNode.insertBefore(y,z);})(window,document,'script','pendo');
  })('${PENDO_API_KEY}');`;
    document.body.appendChild(loaderScript);

    // We can't immediately proceed to initialize Pendo because we need the
    // loader script to run.

    setNeedsInit(true);

    // This cleanup function is imperfect because the Pendo loader script itself
    // creates a script tag in the DOM. This should only matter in a test
    // context.

    return () => loaderScript.remove();
  }, []);

  useEffect(() => {
    // The pendo literal on window is created by the script tag in the effect
    // above. Even so, we check its existence here just in case, and skip
    // initialization if it doesn't exist.

    const pendo = (window as any).pendo;

    if (needsInit && user && getUserRole(user).isOrgAdmin && pendo && !stripeIsLoading && !mailchimpIsLoading) {
      pendo.initialize({
        account: {
          id: user.organizations[0].id,
          organization_name: user.organizations[0].name,
          organization_plan: user.organizations[0].plan.label,
          organization_is_connected_to_mailchimp: connectedToMailchimp,
          organization_is_connected_to_stripe: !requiresVerification
        },
        visitor: {
          email: user.email,
          // User prefix is to distinguish users from contributors in the future.
          id: `${PENDO_VISITOR_PREFIX}-user-${user.id}`,
          role: user.role_type[0]
        }
      });
      setNeedsInit(false);
    }
  }, [connectedToMailchimp, mailchimpIsLoading, needsInit, requiresVerification, stripeIsLoading, user]);
}

export default usePendo;
