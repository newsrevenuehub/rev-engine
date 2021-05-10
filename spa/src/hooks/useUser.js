import { LS_USER } from 'constants/authConstants';

function useUser() {
  return JSON.parse(localStorage.getItem(LS_USER));
}

export default useUser;
