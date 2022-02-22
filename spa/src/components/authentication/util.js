import { LS_USER, LS_CSRF_TOKEN, LS_ORG, LS_RP } from 'settings';

export function getLSOrg() {
  const lsUser = JSON.parse(localStorage.getItem(LS_USER));
  return localStorage.getItem(`${lsUser.id}__${LS_ORG}`);
}

export function setLSOrg(value) {
  const lsUser = JSON.parse(localStorage.getItem(LS_USER));
  localStorage.setItem(`${lsUser.id}__${LS_ORG}`, value);
}

export function getLSRP() {
  const lsUser = JSON.parse(localStorage.getItem(LS_USER));
  return localStorage.getItem(`${lsUser.id}__${LS_RP}`);
}

export function setLSRP(value) {
  const lsUser = JSON.parse(localStorage.getItem(LS_USER));
  localStorage.setItem(`${lsUser.id}__${LS_RP}`, value);
}

export function handleLoginSuccess(data) {
  localStorage.setItem(LS_USER, JSON.stringify(data.user));
  localStorage.setItem(LS_CSRF_TOKEN, data.csrftoken);

  const prevOrg = getLSOrg();
  const prevRPs = getLSRP();

  if (!prevOrg) {
    // If no prevOrg, set to some reasonable default from data.user.role_assignment
    setLSOrg(JSON.stringify(data.user?.role_assignment?.organization || ''));
  }

  if (!prevRPs) {
    // If no prevRPs, set to some reasonable default from data.user.role_assignment
    setLSRP(JSON.stringify(data.user?.role_assignment?.revenue_programs[0] || ''));
  }
}
