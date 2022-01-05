import { LS_CONTRIBUTOR, LS_USER } from 'settings';

function isAuthenticated(for_contributor) {
  if (for_contributor) return localStorage.getItem(LS_CONTRIBUTOR);
  return localStorage.getItem(LS_USER);
}

export default isAuthenticated;
