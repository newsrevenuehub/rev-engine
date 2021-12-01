import { LS_USER } from 'settings';

function useUser() {
  return JSON.parse(localStorage.getItem(LS_USER));
}

export default useUser;
