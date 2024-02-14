import { useEffect, useState } from 'react';
import useUser from './useUser';
import useConnectStripeAccount from './useConnectStripeAccount';
import useConnectMailchimp from './useConnectMailchimp';
import { getUserRole } from 'utilities/getUserRole';
import { loadPendo } from 'utilities/pendo';
import { PENDO_VISITOR_PREFIX } from 'appSettings';

/**
 * Initializes Pendo with the active user. This will not work in an
 * unauthenticated context.
 * @see
 * https://support.pendo.io/hc/en-us/articles/360031862272-Installation-for-single-page-frameworks
 */
export function useDashboardPendo() {
  const [needsInit, setNeedsInit] = useState(true);
  const { user } = useUser();
  const { isLoading: stripeIsLoading, requiresVerification } = useConnectStripeAccount();
  const { isLoading: mailchimpIsLoading, connectedToMailchimp } = useConnectMailchimp();

  useEffect(() => {
    async function init() {
      try {
        await loadPendo();
      } catch (error) {
        // Log it for Sentry but otherwise do nothing.
        console.error(error);
        return;
      }

      // The pendo literal on window should've been created by the initPendo()
      // call above. Even so, we check its existence here just in case.

      const pendo = (window as any).pendo;

      if (pendo) {
        pendo.initialize({
          account: {
            id: user!.organizations[0].id,
            organization_name: user!.organizations[0].name,
            organization_plan: user!.organizations[0].plan.label,
            organization_is_connected_to_mailchimp: connectedToMailchimp,
            organization_is_connected_to_stripe: !requiresVerification
          },
          visitor: {
            email: user!.email,
            // User prefix is to distinguish users from contributors.
            id: `${PENDO_VISITOR_PREFIX}-user-${user!.id}`,
            role: user!.role_type[0]
          }
        });
        setNeedsInit(false);
      }
    }

    if (needsInit && user && getUserRole(user).isOrgAdmin && !stripeIsLoading && !mailchimpIsLoading) {
      init();
    }
  }, [connectedToMailchimp, mailchimpIsLoading, needsInit, requiresVerification, stripeIsLoading, user]);
}

export default useDashboardPendo;
