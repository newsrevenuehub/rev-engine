import axios from 'ajax/axios';
import { TOKEN } from 'ajax/endpoints';
import { LS_USER, LS_CSRF_TOKEN, LS_SIDEBAR_CORE_UPGRADE_CLOSED } from 'appSettings';
import * as Sentry from '@sentry/react';

async function logout() {
  try {
    await axios.delete(TOKEN);
    localStorage.removeItem(LS_USER);
    localStorage.removeItem(LS_CSRF_TOKEN);
    localStorage.removeItem(LS_SIDEBAR_CORE_UPGRADE_CLOSED);
    Sentry.setUser(null);
    window.location.href = '/';
  } catch (e) {
    console.error(e);
  }
}

export default logout;
