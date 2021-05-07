import { LS_USER, LS_CSRF_TOKEN } from 'constants/authConstants';

export function handleLoginSuccess(data) {
  console.log('user org: ', data.user.organization);
  localStorage.setItem(LS_USER, JSON.stringify(data.user));
  localStorage.setItem(LS_CSRF_TOKEN, data.csrftoken);
}

export function handleLogoutSuccess() {
  localStorage.removeItem(LS_USER);
  localStorage.removeItem(LS_CSRF_TOKEN);
  window.location = '/';
}
