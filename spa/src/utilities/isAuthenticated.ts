import { LS_CONTRIBUTOR, SS_CONTRIBUTOR, LS_USER } from 'appSettings';

/**
 * Returns whether the user is currently authenticated. **This is only
 * advisory** because a user could manipulate their browser local storage.
 */
function isAuthenticated(contributorType?: 'CONTRIBUTOR' | 'PORTAL'): boolean {
  switch (contributorType) {
    case 'CONTRIBUTOR':
      return window.localStorage.getItem(LS_CONTRIBUTOR) !== null;
    case 'PORTAL':
      return window.sessionStorage.getItem(SS_CONTRIBUTOR) !== null;
  }

  return window.localStorage.getItem(LS_USER) !== null;
}

export default isAuthenticated;
