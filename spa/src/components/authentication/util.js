import { LS_USER, CSRF_HEADER } from 'constants/authConstants';

export function handleLoginSuccess(data) {
  localStorage.setItem(LS_USER, JSON.stringify(data.user));
  localStorage.setItem(CSRF_HEADER, data.csrftoken);
}

export function handleLogoutSuccess() {
  localStorage.removeItem(LS_USER);
  localStorage.removeItem(CSRF_HEADER);
  window.location = '/';
}
