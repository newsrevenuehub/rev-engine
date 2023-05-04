import { LS_CONTRIBUTOR, LS_USER } from 'appSettings';

/**
 * Returns whether the user is currently authenticated. **This is only
 * advisory** because a user could manipulate their browser local storage.
 */
function isAuthenticated(forContributor?: boolean): boolean {
  if (forContributor) {
    return window.localStorage.getItem(LS_CONTRIBUTOR) !== null;
  }

  return window.localStorage.getItem(LS_USER) !== null;
}

export default isAuthenticated;
