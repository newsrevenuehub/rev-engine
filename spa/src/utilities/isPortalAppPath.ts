import { PORTAL } from 'routes';

function isPortalAppPath() {
  // Check if current path has at least "/portal" at the start of the path
  return window.location.pathname.startsWith(PORTAL.ENTRY.replace(/\/$/, ''));
}

export default isPortalAppPath;
