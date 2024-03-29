import { LS_USER, LS_CSRF_TOKEN } from 'appSettings';

export function handleLoginSuccess(data) {
  localStorage.setItem(LS_USER, JSON.stringify(data.user));
  localStorage.setItem(LS_CSRF_TOKEN, data.csrftoken);
}
