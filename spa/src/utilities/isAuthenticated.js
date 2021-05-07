import { LS_USER } from 'constants/authConstants';

function isAuthenticated() {
  return localStorage.getItem(LS_USER);
}

export default isAuthenticated;
