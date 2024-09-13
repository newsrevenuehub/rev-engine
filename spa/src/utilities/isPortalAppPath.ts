import { PORTAL } from 'routes';

function isPortalAppPath() {
  // Check if current path has at least "/portal" at the start of the path
  return window.location.pathname.indexOf(PORTAL.ENTRY_NO_SLASH) === 0;
}

export default isPortalAppPath;
