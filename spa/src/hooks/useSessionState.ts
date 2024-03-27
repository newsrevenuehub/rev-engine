// This exists because popular existing solutions
// (https://www.npmjs.com/package/react-storage-hooks,
// https://www.npmjs.com/package/use-session-storage-state) require a version of
// React we aren't using. When we upgrade, we should evaluate replacing this
// with one of those.

import { useCallback, useMemo, useState } from 'react';

export const DONATIONS_CORE_UPGRADE_CLOSED = 'donationsCoreUpgradeClosed';
export const SIDEBAR_CORE_UPGRADE_CLOSED = 'sidebarCoreUpgradeClosed';
export const SIDEBAR_PLUS_UPGRADE_CLOSED = 'sidebarPlusUpgradeClosed';
export const SIDEBAR_CONSULTING_UPGRADE_CLOSED = 'sidebarConsultingUpgradeClosed';
export const CUSTOMIZE_CORE_UPGRADE_CLOSED = 'customizeCoreUpgradeClosed';

export type UseSessionStateResult<T> = [
  /**
   * Current value.
   */
  value: T,
  /**
   * Sets a value and tries to persist it in the user session. If persisting
   * fails, no error is thrown.
   */
  setValue: (value: T) => void
];

/**
 * Manages state that persists past a browser refresh, but is cleared when
 * logging out or when the user closes their window/tab. See
 * components/authentication/logout.ts for where this is cleared.
 */
export function useSessionState<T>(key: string, defaultValue: T): UseSessionStateResult<T> {
  // We store the persisted values under a single key to make cleanup easier.
  // Otherwise, we'd have to remember all keys used.

  const initialPersistedValue = useMemo(() => {
    // Memoize the value in session storage when we're first used so we don't
    // re-parse it on every render.

    try {
      const sessionStorage = window.sessionStorage.getItem(key);

      if (sessionStorage) {
        return JSON.parse(sessionStorage);
      }
    } catch {
      // Do nothing and fall back to the specified default.
    }
  }, [key]);

  const [value, baseSetValue] = useState(initialPersistedValue ?? defaultValue);
  const setValue = useCallback(
    (value: T) => {
      baseSetValue(value);

      try {
        window.sessionStorage.setItem(key, JSON.stringify(value));
      } catch {
        // Do nothing. We have at least local storage.
      }
    },
    [key]
  );

  return [value, setValue];
}
