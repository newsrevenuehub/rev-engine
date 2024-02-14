import { useEffect, useState } from 'react';
import { loadPendo } from 'utilities/pendo';
import { usePortalAuthContext } from './usePortalAuth';
import { PENDO_VISITOR_PREFIX } from 'appSettings';
import usePortal from './usePortal';

export function usePortalPendo() {
  const [needsInit, setNeedsInit] = useState(true);
  const { contributor } = usePortalAuthContext();
  const { page } = usePortal();

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
            id: page!.revenue_program.id
          },
          visitor: {
            email: contributor!.email,
            // Contributor portal is to distinguish from dashboard users.
            id: `${PENDO_VISITOR_PREFIX}-contributor-${contributor!.uuid}`,
            role: 'contributor'
          }
        });
        setNeedsInit(false);
      }
    }

    if (needsInit && contributor && page) {
      init();
    }
  }, [contributor, needsInit, page]);
}
