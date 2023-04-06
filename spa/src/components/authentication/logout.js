import axios from 'ajax/axios';
import { TOKEN } from 'ajax/endpoints';
import { LS_USER, LS_CSRF_TOKEN } from 'appSettings';
import * as Sentry from '@sentry/react';

async function logout() {
  try {
    await axios.delete(TOKEN);
    localStorage.removeItem(LS_USER);
    localStorage.removeItem(LS_CSRF_TOKEN);
    Sentry.setUser(null);
    window.location = '/';
  } catch (e) {
    console.error(e);
  }
}

export default logout;
