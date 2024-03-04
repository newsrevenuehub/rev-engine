import axios from 'ajax/axios';
import { TOKEN } from 'ajax/endpoints';
import { LS_USER } from 'appSettings';
import * as Sentry from '@sentry/react';

async function logout() {
  try {
    await axios.delete(TOKEN);
    localStorage.removeItem(LS_USER);
    window.sessionStorage.clear();
    Sentry.setUser(null);
    window.location.assign('/');
  } catch (e) {
    console.error(e);
  }
}

export default logout;
