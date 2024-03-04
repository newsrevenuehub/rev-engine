import * as Sentry from '@sentry/react';
import PropTypes, { InferProps } from 'prop-types';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import axios from 'ajax/axios';
import { VERIFY_TOKEN } from 'ajax/endpoints';
import { LS_CONTRIBUTOR } from 'appSettings';

/**
 * A contributor who has logged into the portal.
 */
export interface Contributor {
  /**
   * Timestamp when the contributor was created.
   */
  created: string;
  /**
   * Contributor's email address.
   */
  email: string;
  /**
   * Internal ID for the contributor.
   */
  id: number;
  /**
   * Timestamp when the contributor was modified.
   */
  modified: string;
  /**
   * Unique ID for the contributor
   */
  uuid: string;
}

/**
 * Properties provided to consumers of usePortalAuthContext.
 */
export interface PortalAuthContextResult {
  /**
   * The current logged-in contributor. If undefined, the user isn't
   * authenticated.
   */
  contributor?: Contributor;
  /**
   * Exchanges a token sent via magic link email for a JWT. If undefined, the
   * user is already authenticated. If this succeeds, contributor is set in
   * context and the function resolves. If it fails, it rejects with either an
   * Axios error (if there were problems with the request itself) or an error
   * with the response from the server.
   */
  verifyToken?: (email: string, token: string) => Promise<void>;
}

/**
 * Expected API response when verifying a token.
 */
export interface VerifyTokenResponse {
  contributor?: Contributor;
  detail: string;
}

export const PortalAuthContext = createContext<PortalAuthContextResult>({});

export const usePortalAuthContext = () => useContext(PortalAuthContext);

const PortalAuthContextProviderProps = {
  children: PropTypes.node.isRequired
};

function identifyUserInSentry(contributor: Contributor) {
  Sentry.setUser({ email: contributor.email, id: contributor.id, ip_address: '{{auto}}' });
}

export function PortalAuthContextProvider({ children }: InferProps<typeof PortalAuthContextProviderProps>) {
  const [contributor, setContributor] = useState<Contributor>();
  const verifyToken = useCallback(async (email: string, token: string) => {
    const { data } = await axios.post<VerifyTokenResponse>(VERIFY_TOKEN, { email, token });

    if (data.detail !== 'success') {
      throw new Error(data.detail);
    }

    if (!data.contributor) {
      throw new Error('No contributor in token verification response');
    }

    // Set values in context and in local storage for later usage. The local
    // storage key is also needed for backwards compat with isAuthenticated() in
    // utilities/, used by ProtectedRoute.

    setContributor(data.contributor);
    identifyUserInSentry(data.contributor);
    localStorage.setItem(LS_CONTRIBUTOR, JSON.stringify(data.contributor));
  }, []);

  // Try to initally set the contributor based on local storage.

  useEffect(() => {
    const lsContributor = localStorage.getItem(LS_CONTRIBUTOR);

    if (!lsContributor) {
      // The contributor hasn't previously logged in.
      return;
    }

    try {
      const { created, email, id, modified, uuid } = JSON.parse(lsContributor);

      if (
        typeof created === 'string' &&
        typeof email === 'string' &&
        typeof id === 'number' &&
        typeof modified === 'string' &&
        typeof uuid === 'string'
      ) {
        const loadedContributor = { created, email, id, modified, uuid };

        setContributor(loadedContributor);
        identifyUserInSentry(loadedContributor);
      }
    } catch {
      // Fail silently--their local storage has become malformed, so we want
      // them to sign in again.
    }
  }, []);

  return (
    <PortalAuthContext.Provider value={contributor ? { contributor } : { verifyToken }}>
      {children}
    </PortalAuthContext.Provider>
  );
}
