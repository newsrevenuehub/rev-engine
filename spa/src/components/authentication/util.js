import { LS_USER } from 'appSettings';

export function handleLoginSuccess(data) {
  localStorage.setItem(LS_USER, JSON.stringify(data.user));
}
