import { LS_USER, LS_CSRF_TOKEN, LS_SELECTED_ORG, LS_SELECTED_RP, LS_AVAILABLE_ORGS, LS_AVAILABLE_RPS } from 'settings';

export function getLSAvailableOrgs() {
  try {
    const lsUser = JSON.parse(localStorage.getItem(LS_USER));
    return JSON.parse(localStorage.getItem(`${lsUser.id}__${LS_AVAILABLE_ORGS}`));
  } catch {
    return [];
  }
}

export function setLSAvailableOrgs(value) {
  const lsUser = JSON.parse(localStorage.getItem(LS_USER));
  localStorage.setItem(`${lsUser.id}__${LS_AVAILABLE_ORGS}`, value);
}

export function getLSAvailableRPs() {
  try {
    const lsUser = JSON.parse(localStorage.getItem(LS_USER));
    return JSON.parse(localStorage.getItem(`${lsUser.id}__${LS_AVAILABLE_RPS}`));
  } catch {
    return [];
  }
}

export function setLSAvailableRPs(value) {
  const lsUser = JSON.parse(localStorage.getItem(LS_USER));
  localStorage.setItem(`${lsUser.id}__${LS_AVAILABLE_RPS}`, value);
}

export function getLSSelectedOrg() {
  const lsUser = JSON.parse(localStorage.getItem(LS_USER));
  return JSON.parse(localStorage.getItem(`${lsUser.id}__${LS_SELECTED_ORG}`));
}

export function setLSSelectedOrg(value) {
  const lsUser = JSON.parse(localStorage.getItem(LS_USER));
  localStorage.setItem(`${lsUser.id}__${LS_SELECTED_ORG}`, value);
}

export function getLSSelectedRP() {
  const lsUser = JSON.parse(localStorage.getItem(LS_USER));
  return JSON.parse(localStorage.getItem(`${lsUser.id}__${LS_SELECTED_RP}`));
}

export function setLSSelectedRP(value) {
  const lsUser = JSON.parse(localStorage.getItem(LS_USER));
  localStorage.setItem(`${lsUser.id}__${LS_SELECTED_RP}`, value);
}

export function setTokenDataToLS(data) {
  localStorage.setItem(LS_USER, JSON.stringify(data.user));
  localStorage.setItem(LS_CSRF_TOKEN, data.csrftoken);
  setLSAvailableOrgs(JSON.stringify(data.user?.organizations));
  setLSAvailableRPs(JSON.stringify(data.user?.revenue_programs));
}
