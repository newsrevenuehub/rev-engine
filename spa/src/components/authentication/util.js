import { LS_USER, LS_CSRF_TOKEN, LS_SELECTED_ORG, LS_SELECTED_RP, LS_AVAILABLE_ORGS, LS_AVAILABLE_RPS } from 'settings';

export function getAvailableOrgsLSKey(user) {
  return `${user.id}__${LS_AVAILABLE_ORGS}`;
}

export function getSelectedOrgLSKey(user) {
  return `${user.id}__${LS_SELECTED_ORG}`;
}

export function getAvailableRPsLSKey(user) {
  return `${user.id}__${LS_AVAILABLE_RPS}`;
}

export function getSelectedRPLSKey(user) {
  return `${user.id}__${LS_SELECTED_RP}`;
}

export function getLSAvailableOrgs() {
  try {
    const lsUser = JSON.parse(localStorage.getItem(LS_USER));
    return JSON.parse(localStorage.getItem(getAvailableOrgsLSKey(lsUser)));
  } catch {
    return [];
  }
}

export function setLSAvailableOrgs(value) {
  const lsUser = JSON.parse(localStorage.getItem(LS_USER));
  localStorage.setItem(getAvailableOrgsLSKey(lsUser), value);
}

export function getLSAvailableRPs() {
  try {
    const lsUser = JSON.parse(localStorage.getItem(LS_USER));
    return JSON.parse(localStorage.getItem(getAvailableRPsLSKey(lsUser)));
  } catch {
    return [];
  }
}

export function setLSAvailableRPs(value) {
  const lsUser = JSON.parse(localStorage.getItem(LS_USER));
  localStorage.setItem(getAvailableRPsLSKey(lsUser), value);
}

export function getLSSelectedOrg() {
  const lsUser = JSON.parse(localStorage.getItem(LS_USER));
  return JSON.parse(localStorage.getItem(getSelectedOrgLSKey(lsUser)));
}

export function setLSSelectedOrg(value) {
  const lsUser = JSON.parse(localStorage.getItem(LS_USER));
  localStorage.setItem(getSelectedOrgLSKey(lsUser), value);
}

export function getLSSelectedRP() {
  const lsUser = JSON.parse(localStorage.getItem(LS_USER));
  return JSON.parse(localStorage.getItem(getSelectedRPLSKey(lsUser)));
}

export function setLSSelectedRP(value) {
  const lsUser = JSON.parse(localStorage.getItem(LS_USER));
  localStorage.setItem(getSelectedRPLSKey(lsUser), value);
}

export function setTokenDataToLS(data) {
  localStorage.setItem(LS_USER, JSON.stringify(data.user));
  localStorage.setItem(LS_CSRF_TOKEN, data.csrftoken);
  setLSAvailableOrgs(JSON.stringify(data.user?.organizations));
  setLSAvailableRPs(JSON.stringify(data.user?.revenue_programs));
}
