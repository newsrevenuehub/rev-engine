import { LS_USER } from 'constants/authConstants';

function useUser() {
  return localStorage.getItem(LS_USER);
}

export default useUser;
